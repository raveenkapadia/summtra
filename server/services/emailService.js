// ============================================
// SUMMITRA - Email Service
// Sends reports via email using Resend
// ============================================

const { Resend } = require('resend');
const fs = require('fs').promises;

const getResendClient = () => {
  return new Resend(process.env.RESEND_API_KEY);
};

/**
 * Send report email with PDF attachment
 */
async function sendReportEmail(userData, pdfPath, reportType) {
  console.log(`\n📧 Sending email to ${userData.email}...\n`);
  
  try {
    const resend = getResendClient();
    
    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');
    
    // Get report type label
    const reportLabel = reportType === 'combo' 
      ? 'India + International Combo'
      : reportType === 'india' ? 'India' : 'International';
    
    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Summitra <onboarding@resend.dev>', // Use resend.dev for testing, update with your domain later
      to: userData.email,
      subject: `🧭 Your Summitra Astrocartography Report is Ready, ${userData.name}!`,
      html: generateEmailHTML(userData, reportLabel),
      attachments: [
        {
          filename: `Summitra_Report_${userData.name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBase64,
          type: 'application/pdf'
        }
      ]
    });
    
    if (error) {
      console.error('❌ Email error:', error);
      throw new Error(error.message);
    }
    
    console.log(`✅ Email sent successfully! ID: ${data.id}\n`);
    return { success: true, emailId: data.id };
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(userData, reportLabel) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0a1628 0%, #1a237e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #d4af37; font-size: 32px; margin: 0; letter-spacing: 3px;">SUMMITRA</h1>
      <p style="color: #f4e4bc; font-size: 12px; margin: 10px 0 0 0; letter-spacing: 2px;">ASTROCARTOGRAPHY</p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #0a1628; font-size: 24px; margin: 0 0 20px 0;">
        Hi ${userData.name}! 🌟
      </h2>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Your personalized <strong>${reportLabel} Astrocartography Report</strong> is ready! 
        We've analyzed your birth chart and mapped your planetary lines across the world to reveal 
        your most powerful locations.
      </p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #d4af37; padding: 20px; margin: 30px 0;">
        <p style="color: #333; font-size: 14px; margin: 0;">
          <strong>📎 Your report is attached as a PDF.</strong><br>
          You can download it and refer to it anytime.
        </p>
      </div>
      
      <h3 style="color: #1a237e; font-size: 18px; margin: 30px 0 15px 0;">
        What's Inside Your Report:
      </h3>
      
      <ul style="color: #333; font-size: 14px; line-height: 2; padding-left: 20px;">
        <li>Your complete planetary lines analysis</li>
        <li>Top cities for Career, Love, Wealth, Health & more</li>
        <li>Rare Paran Crossings (super power zones)</li>
        <li>Best timing for relocation</li>
        <li>Personalized action plan</li>
      </ul>
      
      <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff 100%); border: 2px solid #d4af37; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
        <p style="color: #0a1628; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
          "The stars incline, they do not compel."
        </p>
        <p style="color: #666; font-size: 14px; margin: 0;">
          Use this report as a guide, not a rulebook. Your choices always matter most.
        </p>
      </div>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        We hope this report helps you make empowered decisions about where to live, work, and thrive.
        If you have any questions, simply reply to this email.
      </p>
      
      <p style="color: #333; font-size: 16px; margin: 30px 0 0 0;">
        Wishing you clarity and success,<br>
        <strong style="color: #d4af37;">The Summitra Team</strong> 🧭
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #0a1628; padding: 30px; text-align: center;">
      <p style="color: #d4af37; font-size: 18px; margin: 0 0 10px 0; letter-spacing: 2px;">
        SUMMITRA
      </p>
      <p style="color: #a0a0a0; font-size: 12px; margin: 0 0 20px 0;">
        Your Stars. Your Cities. Your Destiny.
      </p>
      <p style="color: #666; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Summitra. All rights reserved.<br>
        This email was sent to ${userData.email}
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

/**
 * Send order confirmation email (before report generation)
 */
async function sendOrderConfirmation(userData, reportType, orderId) {
  console.log(`📧 Sending order confirmation to ${userData.email}...`);
  
  try {
    const resend = getResendClient();
    
    const reportLabel = reportType === 'combo' 
      ? 'India + International Combo'
      : reportType === 'india' ? 'India' : 'International';
    
    const { data, error } = await resend.emails.send({
      from: 'Summitra <onboarding@resend.dev>',
      to: userData.email,
      subject: `✅ Order Confirmed - Your Summitra Report is Being Prepared`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #0a1628 0%, #1a237e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #d4af37; font-size: 32px; margin: 0;">SUMMITRA</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #0a1628;">Order Confirmed! ✅</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Hi ${userData.name},<br><br>
        Thank you for your order! We're now generating your personalized 
        <strong>${reportLabel} Astrocartography Report</strong>.
      </p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #333;">
          <strong>Order ID:</strong> ${orderId}<br>
          <strong>Report Type:</strong> ${reportLabel}<br>
          <strong>Delivery:</strong> Via email within 10-15 minutes
        </p>
      </div>
      <p style="color: #333; margin-top: 30px;">
        Best regards,<br><strong style="color: #d4af37;">The Summitra Team</strong>
      </p>
    </div>
    <div style="background-color: #0a1628; padding: 20px; text-align: center;">
      <p style="color: #a0a0a0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Summitra</p>
    </div>
  </div>
</body>
</html>
      `
    });
    
    if (error) throw new Error(error.message);
    
    console.log(`✅ Order confirmation sent!`);
    return { success: true, emailId: data.id };
    
  } catch (error) {
    console.error('❌ Failed to send confirmation:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendReportEmail, sendOrderConfirmation };
