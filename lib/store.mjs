import {neon} from '@neondatabase/serverless';
import {HttpError} from './http.mjs';
export function createStore(env=process.env,sqlClient){
  if(!env.DATABASE_URL&&!sqlClient)throw new HttpError(503,'The form is being configured. Please email summitskibike@gmail.com.');
  const sql=sqlClient||neon(env.DATABASE_URL);
  return {
    async accept(inquiry,fingerprint,client){
      const existing=await sql`SELECT * FROM inquiries WHERE id=${inquiry.id}`;
      if(existing.length){if(existing[0].fingerprint!==fingerprint)throw new HttpError(409,'This submission has changed. Refresh the page and try again.');return existing[0];}
      const [ipCounter]=await sql`INSERT INTO form_limits (bucket,used) VALUES (${`contact:${client}`},1)
        ON CONFLICT (bucket) DO UPDATE SET used=CASE WHEN form_limits.window_started>NOW()-INTERVAL '1 hour' THEN LEAST(form_limits.used+1,6) ELSE 1 END,
        window_started=CASE WHEN form_limits.window_started>NOW()-INTERVAL '1 hour' THEN form_limits.window_started ELSE NOW() END RETURNING used`;
      if(ipCounter.used>5)throw new HttpError(429,'Too many messages. Please try again later.');
      // A single locked counter coordinates concurrent serverless requests. A conservative
      // 40 inquiries/day leaves headroom below Resend Free's 100 outgoing emails/day.
      const [counter]=await sql`INSERT INTO form_limits (bucket, used) VALUES ('contact-day',1)
        ON CONFLICT (bucket) DO UPDATE SET used=CASE WHEN form_limits.window_started::date=CURRENT_DATE THEN LEAST(form_limits.used+1,41) ELSE 1 END,
        window_started=CASE WHEN form_limits.window_started::date=CURRENT_DATE THEN form_limits.window_started ELSE NOW() END
        RETURNING used`;
      if(counter.used>40)throw new HttpError(429,'The daily message limit has been reached. Please email summitskibike@gmail.com.');
      const rows=await sql`INSERT INTO inquiries (id,reference,fingerprint,season,first_name,last_name,email,phone,interests,message) VALUES (${inquiry.id},${inquiry.reference},${fingerprint},${inquiry.season},${inquiry.firstName},${inquiry.lastName},${inquiry.email},${inquiry.phone},${JSON.stringify(inquiry.interests)}::jsonb,${inquiry.message}) ON CONFLICT (id) DO NOTHING RETURNING *`;
      const row=rows[0]||(await sql`SELECT * FROM inquiries WHERE id=${inquiry.id}`)[0];
      if(row.fingerprint!==fingerprint)throw new HttpError(409,'This submission has changed. Refresh the page and try again.');
      return row;
    },
    async claim(id){return (await sql`UPDATE inquiries SET delivery_lock_until=NOW()+INTERVAL '2 minutes' WHERE id=${id} AND (delivery_lock_until IS NULL OR delivery_lock_until<NOW()) RETURNING *`)[0];},
    async sent(id,kind,messageId){if(kind==='owner')await sql`UPDATE inquiries SET owner_email_id=${messageId} WHERE id=${id}`;else await sql`UPDATE inquiries SET client_email_id=${messageId} WHERE id=${id}`;},
    async release(id){await sql`UPDATE inquiries SET delivery_lock_until=NULL WHERE id=${id}`;},
  };
}
