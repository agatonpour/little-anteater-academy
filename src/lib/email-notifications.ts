import { supabase } from "@/integrations/supabase/client";

export const sendEmailNotification = async (
  to: string, 
  subject: string, 
  html: string,
  type: 'session_confirmed' | 'session_cancelled' | 'session_requested' | 'player_cancelled'
) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        to,
        subject,
        html,
        type
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
};

export const generateSessionRequestEmail = (playerName: string, coachName: string, sessionDate: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e40af;">New Session Request - Anteater Academy</h2>
      <p>Hello ${coachName},</p>
      <p>You have received a new session request from <strong>${playerName}</strong>.</p>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Session Date & Time:</strong> ${sessionDate}</p>
        <p><strong>Player:</strong> ${playerName}</p>
      </div>
      <p>Please log in to your coach dashboard to confirm or decline this request.</p>
      <p>Best regards,<br>Anteater Academy Team</p>
    </div>
  `;
};

export const generateSessionConfirmedEmail = (playerName: string, coachName: string, sessionDate: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #059669;">Session Confirmed - Anteater Academy</h2>
      <p>Hello ${playerName},</p>
      <p>Great news! Your training session has been confirmed by <strong>${coachName}</strong>.</p>
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
        <p><strong>Session Date & Time:</strong> ${sessionDate}</p>
        <p><strong>Coach:</strong> ${coachName}</p>
      </div>
      <p>We look forward to seeing you at your training session!</p>
      <p>Best regards,<br>Anteater Academy Team</p>
    </div>
  `;
};

export const generateSessionCancelledEmail = (playerName: string, coachName: string, sessionDate: string, cancelledBy: 'coach' | 'player') => {
  const title = cancelledBy === 'coach' ? 'Session Cancelled by Coach' : 'Session Cancellation Confirmed';
  const message = cancelledBy === 'coach' 
    ? `Unfortunately, your training session with <strong>${coachName}</strong> has been cancelled.`
    : `Your training session with <strong>${coachName}</strong> has been successfully cancelled.`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626;">${title} - Anteater Academy</h2>
      <p>Hello ${playerName},</p>
      <p>${message}</p>
      <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p><strong>Cancelled Session:</strong> ${sessionDate}</p>
        <p><strong>Coach:</strong> ${coachName}</p>
      </div>
      ${cancelledBy === 'coach' ? '<p>Please feel free to book another session when convenient.</p>' : '<p>You can book a new session anytime from your dashboard.</p>'}
      <p>Best regards,<br>Anteater Academy Team</p>
    </div>
  `;
};

export const generatePlayerCancelledEmail = (playerName: string, coachName: string, sessionDate: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #ea580c;">Session Cancelled by Player - Anteater Academy</h2>
      <p>Hello ${coachName},</p>
      <p><strong>${playerName}</strong> has cancelled their training session with you.</p>
      <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
        <p><strong>Cancelled Session:</strong> ${sessionDate}</p>
        <p><strong>Player:</strong> ${playerName}</p>
      </div>
      <p>The time slot is now available for other bookings.</p>
      <p>Best regards,<br>Anteater Academy Team</p>
    </div>
  `;
};