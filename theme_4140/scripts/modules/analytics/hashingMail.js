// define([], function() {
//     var hashedMail = {
//         mailHashing : async function(email) {
//             let hashSalt = 'make_this_unique';
//             var encoder = new TextEncoder();
//             var encodedEmail = encoder.encode(email.concat(hashSalt));
//             var hashEmailBuffer = await window.crypto.subtle.digest('SHA-256', encodedEmail);
//             var hashEmailArray = Array.from(new Uint8Array(hashEmailBuffer)); 
//             var hashEmailHex = hashEmailArray.map((b) => b.toString(16).padStart(2, '0')).join('');
//             this.model.set('hashed_email',hashEmailHex);
//         },
//     };

//     return hashedMail;
    
// });