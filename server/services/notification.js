// ============================================
// NOTIFICATION SERVICE
// Handles sending alerts to family contacts via Zalo/Telegram
// ============================================
const FamilyContact = require('../models/FamilyContact');

class NotificationService {
  /**
   * Send notification to family contacts when high/medium risk detected
   */
  async notifyFamily(userId, detection) {
    try {
      const contacts = FamilyContact.getNotifiableContacts(userId);

      if (contacts.length === 0) {
        console.log('[Notify] No contacts with autoNotify enabled');
        return { success: true, sent: 0 };
      }

      const riskLabels = { high: 'Nguy hiểm', medium: 'Nghi ngờ', low: 'An toàn' };
      const typeLabels = { video: 'Video/Ảnh', audio: 'Giọng nói', link: 'Đường dẫn' };

      const message = this.buildMessage(detection, riskLabels, typeLabels);

      // TODO: Integrate with actual Zalo/Telegram API
      // For now, just log the notification
      console.log('[Notify] Would send to:', contacts.map(c => `${c.name} (${c.phone})`));
      console.log('[Notify] Message:', message);

      // Simulate sending
      const results = await Promise.all(
        contacts.map(contact => this.sendToContact(contact, message))
      );

      const sent = results.filter(r => r.success).length;

      return { success: true, sent, total: contacts.length };
    } catch (err) {
      console.error('[NotificationService] Error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Build notification message
   */
  buildMessage(detection, riskLabels, typeLabels) {
    const riskLabel = riskLabels[detection.riskLevel] || 'Không xác định';
    const typeLabel = typeLabels[detection.type] || detection.type;

    let message = `🚨 CẢNH BÁO TỪ SAFEGUARD SENIOR\n\n`;
    message += `Người thân của bạn vừa phát hiện nội dung nghi ngờ:\n\n`;
    message += `📋 Loại: ${typeLabel}\n`;
    message += `⚠️ Mức độ rủi ro: ${riskLabel}\n`;
    message += `📊 Độ tin cậy: ${detection.confidence}%\n`;

    if (detection.details) {
      message += `\n💡 Chi tiết: ${detection.details}\n`;
    }

    if (detection.riskLevel === 'high') {
      message += `\n⚠️ VUI LÒNG LIÊN HỆ NGAY ĐỂ HỖ TRỢ!`;
    }

    message += `\n\n⏰ Thời gian: ${new Date(detection.createdAt).toLocaleString('vi-VN')}`;

    return message;
  }

  /**
   * Send message to individual contact
   * TODO: Implement actual Zalo/Telegram API integration
   */
  async sendToContact(contact, message) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, implement:
    // - Zalo API: https://developers.zalo.me/
    // - Telegram Bot API: https://core.telegram.org/bots/api

    console.log(`[Notify] Sent to ${contact.name} via ${contact.platform}`);

    return { success: true, contactId: contact.id };
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId, contactId) {
    try {
      const contact = FamilyContact.findById(contactId, userId);

      if (!contact) {
        return { success: false, message: 'Không tìm thấy liên hệ' };
      }

      const testMessage = `🧪 TIN NHẮN THỬ NGHIỆM\n\nĐây là tin nhắn thử nghiệm từ SafeGuard Senior.\n\nNếu bạn nhận được tin nhắn này, hệ thống thông báo đang hoạt động tốt! ✅`;

      const result = await this.sendToContact(contact, testMessage);

      return { success: result.success, message: 'Đã gửi tin nhắn thử nghiệm' };
    } catch (err) {
      console.error('[NotificationService] Test notification error:', err);
      return { success: false, message: err.message };
    }
  }
}

module.exports = new NotificationService();
