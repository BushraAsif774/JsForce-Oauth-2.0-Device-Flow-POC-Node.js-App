import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import jsforce from 'jsforce';

dotenv.config();

type tokenResponseData = {
  access_token: string;
  refresh_token:string;
  instance_url:string;
};
async function performDeviceFlow() {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const loginUrl = 'https://login.salesforce.com';
  const urlEndpoint = `${loginUrl}/services/oauth2/token`;

  // Step 1: Obtain device code and user code
  const deviceCodeResponse = await axios.post(urlEndpoint, {
    client_id: clientId,
    response_type: 'device_code',
  },{
    headers:{
      "Content-Type":"application/x-www-form-urlencoded"
    }
  });
  const { user_code, device_code, interval, verification_uri } = deviceCodeResponse.data;

  // Step 2: Display user code to the user
  console.log(deviceCodeResponse.data);
  console.log(`----------------------------------------------------------------------------------------
   \n Enter this code: "${user_code}" to the following URL: "${verification_uri}" \n 
-----------------------------------------------------------------------------------  `)

  // Step 3: Poll for access token
  const pollOptions = {
    method: 'POST',
    url: urlEndpoint,
    timeout: 60000,
    params: {
      grant_type: 'device',
      client_id: clientId,
      code: device_code
    },
    Headers:{
      "Content-Type":"application/x-www-form-urlencoded"
    }
  };

  let tokenResponseData:tokenResponseData;
  while (true) {

    await new Promise((resolve)=> setTimeout(resolve,5000) );

    try {
      const tokenResponse = await axios(pollOptions);
      tokenResponseData = tokenResponse.data;
      break;
    } catch (error:any) {
      // If the user hasn't authorized yet, continue polling
      if (error.response?.status === 400 && error.response?.data.error === 'authorization_pending') {
        continue;
      }
      if ( (error as AxiosError).code == "ETIMEDOUT" ){
        continue;
      }
      else{
      console.error('An error occurred during token retrieval:', error);}
      return;
    }
  }

  // Step 4: Salesforce Grant access token
  console.log('---------------------------------------------------------------------------------------- \n Token Response Data:', tokenResponseData, '\n----------------------------------------------------------------------------------------');
  // return tokenResponseData;

  var conn = new jsforce.Connection({
    oauth2 : {
      clientId : process.env.SALESFORCE_CLIENT_ID,
      clientSecret : process.env.CLIENT_SECRET_ID,
      
    },
    instanceUrl : tokenResponseData.instance_url,
    accessToken : tokenResponseData.access_token, 
    refreshToken : tokenResponseData.refresh_token
  });
  conn.on("refresh", function(accessToken, res) {
    // Refresh event will be fired when renewed access token
    // to store it in your storage for next request
    
  });
  // conn.sobject("Account").retrieve("0012t00000SufMyAAJ", function(err, account) {
  //   if (err) { return console.error(err); }
  //   console.log("Name : " + account);
  //   // ...
  // });
  // Single record creation
  conn.sobject("Account").create({ Name : 'My Account #3' }, function(err, ret) {
    if (err || !ret.success) { return console.error(err, ret); }
    console.log("Created record id : " + ret.id);
    // ...
  });

  
}
// async function main() {
//   try {
//     const tokenData= await performDeviceFlow();
//     let accessToken=tokenData?.access_token;
    
//     const conn = new jsforce.Connection({
//       accessToken: tokenData?.access_token,
//       refreshToken: tokenData?.refresh_token,
//       instanceUrl: tokenData?.instance_url,
      
//     });

//     console.log("----- MAIN FUNCTION TOKEN DATA: -----------------", tokenData)
//   } catch (error) {
//     console.error('Error:', error);
//   }
  
// }
performDeviceFlow();
// main();
