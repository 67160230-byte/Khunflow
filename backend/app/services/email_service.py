import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.config import settings

def _send_email_sync(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """Synchronous SMTP email sender"""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # SMTP not configured
        return False

    sender_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
    sender_name = settings.EMAILS_FROM_NAME or "KhumFlow"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email

    if text_content:
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(sender_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(sender_email, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False

async def send_password_reset_email(to_email: str, reset_token: str, user_name: Optional[str] = None) -> bool:
    """Async wrapper to send password reset email with direct reset link"""
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    reset_url = f"{frontend_url}/login?reset_token={reset_token}&email={to_email}"
    name_display = user_name or to_email

    subject = "🔑 [KhumFlow] ลิงก์ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ตั้งรหัสผ่านใหม่ KhumFlow</title>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 20px; }}
        .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb; }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ display: inline-block; background: #15803d; color: white; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-size: 22px; font-weight: bold; }}
        .title {{ font-size: 20px; font-weight: bold; margin-top: 12px; color: #111827; }}
        .btn {{ display: inline-block; background-color: #15803d; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 15px; margin: 20px 0; text-align: center; }}
        .token-box {{ background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }}
        .token-code {{ font-size: 24px; font-family: monospace; font-weight: bold; letter-spacing: 4px; color: #92400e; }}
        .footer {{ font-size: 12px; color: #6b7280; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🌿</div>
          <div class="title">KhumFlow Password Reset</div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">ระบบบริหารจัดการร้านอาหารและคลังวัตถุดิบ</p>
        </div>
        
        <p>สวัสดีคุณ <strong>{name_display}</strong>,</p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
          เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ หากคุณเป็นผู้ส่งคำขอนี้ สามารถคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ได้ทันที (ลิงก์มีอายุ 15 นาที):
        </p>

        <div style="text-align: center;">
          <a href="{reset_url}" class="btn" target="_blank">ตั้งรหัสผ่านใหม่ (Reset Password)</a>
        </div>

        <div class="token-box">
          <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-bottom: 4px;">หรือกรอกรหัส Reset Token ด้วยตนเอง:</div>
          <div class="token-code">{reset_token}</div>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
          หากคุณไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่าน สามารถละเว้นอีเมลฉบับนี้ได้อย่างปลอดภัย บัญชีของคุณจะยังคงปลอดภัยตามเดิม
        </p>

        <div class="footer">
          © 2026 KhumFlow • Intelligent Restaurant & Inventory Management
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""
    สวัสดีคุณ {name_display},

    เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี KhumFlow ของคุณ
    คุณสามารถตั้งรหัสผ่านใหม่ได้โดยเปิดลิงก์นี้:
    {reset_url}

    หรือกรอก Reset Token: {reset_token}
    (รหัสและลิงก์มีอายุ 15 นาที)

    หากคุณไม่ได้เป็นผู้ส่งคำขอ สามารถเพิกเฉยอีเมลนี้ได้
    """

    return await asyncio.to_thread(_send_email_sync, to_email, subject, html_content, text_content)
