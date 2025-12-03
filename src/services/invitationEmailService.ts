export async function sendInvitationEmail(
  email: string, 
  fullName: string, 
  role: string, 
  token: string
): Promise<any> {
  try {
    const webhookUrl = 'https://seobrand.app.n8n.cloud/webhook/send-invitation';
    const appUrl = 'https://preview--skywide-content-flow.lovable.app';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        fullName,
        role,
        token,
        appUrl,
        branding: {
          companyName: 'SKYWIDE',
          subtitle: 'POWERED BY SEOBRAND AI',
          primaryColor: '#06b6d4', // brand-cyan
          backgroundColor: '#1a1a1a'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Webhook failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Email webhook error:', error);
    throw error;
  }
}