/* eslint-disable no-console */
import log from './LogService';

const { MAILGUN_API_KEY, MAILGUN_DOMAIN, NODE_ENV } = process.env;
const isProduction = NODE_ENV === 'production';

const mailgun = require('mailgun-js')({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });

/**
 * Mail Service.
 */

/**
 * @description header
 * @param {string} title
 */
const buildHeader = (title) => `
<tr>
  <td bgcolor="#fff" style="padding: 10px 30px 0px 30px; border-bottom: 1px solid #000;">         
    <table align="left" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 680px;">  
      <tr>
        <td height="70">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 5px 0 0 0; color: #000; font-family: roboto; font-size: 32px; line-height: 38px; font-weight: bold;">
                ${title}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

/**
 * Mail Service Body.
 * @typedef {object} Body.
 * @property {string} title - section title.
 * @property {string} content - section content.
 */

/**
 * @description body
 * @param {object} Body : { title, content }
 */
const buildBody = (body) => body
  .map(
    (body) => `
<tr>
  <td style="padding: 30px; border-bottom: 1px solid #000;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="color: #000; font-family: roboto; padding: 0 0 15px 0; font-size: 24px; line-height: 28px;font-weight: bold;">
          ${body.title}
        </td>
      </tr>
      <tr>
        <td style="color: #000; font-family: roboto; font-size: 16px; line-height: 22px;">
          ${body.content}              
        </td>
      </tr>
    </table>
  </td>
</tr>
`,
  )
  .join('');

/**
 * @description footer
 */
const buildFooter = () => `
<tr>
  <td bgcolor="#fff" style="padding: 20px 30px 15px 30px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="font-family: roboto; font-size: 14px; color: #000;">
          Copyright(c) doohyeong.dev, Inc. All Rights Reserved.<br>
        </td>
      </tr>            
    </table>
  </td>
</tr>
`;

/**
 * @description layout
 * @param {string} title
 * @param {object} body: Body : { title, content }
 */
export const buildTemplate = (title, body) => `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
 
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Email templete</title>  
</head>

<body bgcolor="#fff" style="margin: 0; padding: 0; min-width: 100%;">
<table width="100%" bgcolor="#fff" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <table bgcolor="#fff" align="center" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 750px;">
        ${buildHeader(title)}
        ${buildBody(body)}
        ${buildFooter()}
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

/**
 * @description Signup Mail
 * @param {string} title Signup
 */
export const buildSignupMail = ({ title }) => buildTemplate((title), [
  {
    title: 'Thanks for signing up',
    content: `
    Member registration is performed according to the following procedure.
    `,
  },
  {
    title: '',
    content: `
    <ol>
      <li style="font-weight: 700">Signup Request</li>
      <li>Manager Approval</li>
      <li>Password registration through new approval email link</li>
      <li>Login</li>
    </ol>
    `,
  },
]);

/**
 * @description password Mail
 * @param {string} title Password Change
 * @param {string} changePasswordURL URL
 */
export const buildPasswordMail = ({ title, changePasswordURL }) => buildTemplate(title, [
  {
    title,
    content: `
    Your password change request has been approved.
    <ul>
      <li>Register your password on the link page below</li>
      <li><a href=${changePasswordURL}>Update Password</a> The password registration link can only be used once within 7 days.</li>
    </ul>
    <div style="text-align: center;">
      <a target="_blank" href="${changePasswordURL}">
        <button style="background: #000; color: #fff; padding: 12px 20px; font-family: roboto; border-radius: 4px; border: none; line-height: 20px; height: 44px">
          Update Password
        </button>
      </a>
    </div>
    `,
  },
]);

/**
 * @description send mail module
 * @param {string} subject
 * @param {string} html
 * @param {string} to
 * @param {string} bcc
 */
export const mail = async ({
  req,
  to,
  html,
  subject,
}) => {
  try {
    const options = {
      from: 'doohyeong.dev <sysadmin@doohyeong.dev>',
      bcc: isProduction ? 'sysadmin@doohyeong.dev' : 'doohyeong.dev@gmail.com', // remove in soon
      to,
      subject,
      html,
    };
    return new Promise((resolve, reject) => {
      mailgun.messages().send(options, (error, body) => {
        if (error) {
          return reject(error);
        }
        const type = 'MAIL';
        const action = `MAIL "${subject}" 발송 (${to})`;

        log({
          req, type, action, data: html,
        }); // logging

        return resolve('', body);
      });
    });
  } catch (error) {
    console.error(error);
    const type = 'ERROR:MAIL';
    const action = `MAIL "${subject}" 발송 실패 (${to})`;
    log({
      req, type, action, data: error,
    }); // logging
    return false;
  }
};
