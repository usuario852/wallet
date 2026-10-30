// Generates the VAPID key pair needed for Web Push.
//   npm install && npm run vapid
// Then paste both values into the Vercel project's environment variables.
import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:tu@correo.com');
