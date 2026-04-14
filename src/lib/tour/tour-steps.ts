import type { TourConfig } from "./types";

export const TOUR_STEPS: TourConfig = {
  "/admin/dashboard": [
    {
      element: '[data-tour="sidebar-nav"]',
      popover: {
        title: "เมนูนำทาง",
        description:
          "ใช้เมนูด้านซ้ายเพื่อเข้าถึงส่วนต่างๆ ของแผงควบคุม เช่น จัดการผู้ใช้ วิดีโอ และสิทธิ์การเข้าถึง",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="stat-users"]',
      popover: {
        title: "จำนวนผู้ใช้ทั้งหมด",
        description: "แสดงจำนวนผู้ใช้ที่ลงทะเบียนทั้งหมดในระบบ",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="stat-videos"]',
      popover: {
        title: "วิดีโอที่ใช้งาน",
        description: "แสดงจำนวนวิดีโอที่เปิดใช้งานอยู่ในขณะนี้",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="stat-permissions"]',
      popover: {
        title: "สิทธิ์ที่ใช้งาน",
        description: "แสดงจำนวนสิทธิ์การเข้าถึงวิดีโอที่กำลังใช้งานอยู่",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="header-theme-toggle"]',
      popover: {
        title: "สลับธีม",
        description: "สลับระหว่างโหมดสว่างและโหมดมืด",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="header-user-menu"]',
      popover: {
        title: "เมนูผู้ใช้",
        description: "ดูข้อมูลโปรไฟล์และออกจากระบบ",
        side: "bottom",
        align: "end",
      },
    },
  ],

  "/admin/users": [
    {
      element: '[data-tour="users-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description:
          "ค้นหาผู้ใช้ด้วยชื่อหรืออีเมล กรองตามบทบาทและสถานะ หรือเพิ่มผู้ใช้ใหม่",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="users-table"]',
      popover: {
        title: "ตารางผู้ใช้",
        description:
          "ดูรายชื่อผู้ใช้ทั้งหมด คลิกที่ชื่อเพื่อดูรายละเอียดและจัดการสิทธิ์",
        side: "top",
      },
    },
  ],

  "/admin/videos": [
    {
      element: '[data-tour="videos-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description:
          "ค้นหาวิดีโอจากชื่อเรื่อง กรองตามสถานะ หรืออัปโหลดวิดีโอใหม่ (รองรับ MP4)",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="videos-table"]',
      popover: {
        title: "ตารางวิดีโอ",
        description:
          "ดูรายการวิดีโอทั้งหมด คลิกเพื่อแก้ไขรายละเอียดหรือจัดการเอกสารประกอบ",
        side: "top",
      },
    },
  ],

  "/admin/playlists": [
    {
      element: '[data-tour="playlists-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description: "ค้นหาเพลย์ลิสต์จากชื่อ หรือสร้างเพลย์ลิสต์ใหม่เพื่อจัดกลุ่มวิดีโอ",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="playlists-table"]',
      popover: {
        title: "ตารางเพลย์ลิสต์",
        description: "ดูเพลย์ลิสต์ทั้งหมด คลิกเพื่อจัดการวิดีโอในเพลย์ลิสต์",
        side: "top",
      },
    },
  ],

  "/admin/permissions": [
    {
      element: '[data-tour="permissions-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description:
          "ค้นหาสิทธิ์ตามชื่อหรืออีเมล กรองตามวิดีโอและสถานะ หรือให้สิทธิ์ใหม่",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="permissions-table"]',
      popover: {
        title: "ตารางสิทธิ์",
        description:
          "ดูและจัดการสิทธิ์การเข้าถึงวิดีโอทั้งหมด สามารถเพิกถอนสิทธิ์ได้",
        side: "top",
      },
    },
  ],

  "/admin/invite-links": [
    {
      element: '[data-tour="invite-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description:
          "ค้นหาลิงก์เชิญ กรองตามสถานะ หรือสร้างลิงก์ใหม่สำหรับให้นักเรียนสมัครสมาชิก",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="invite-table"]',
      popover: {
        title: "ตารางลิงก์เชิญ",
        description: "ดูลิงก์เชิญทั้งหมด ตรวจสอบสถานะและจำนวนการใช้งาน",
        side: "top",
      },
    },
  ],

  "/admin/oauth": [
    {
      element: '[data-tour="oauth-providers"]',
      popover: {
        title: "ผู้ให้บริการล็อกอิน",
        description:
          "ตั้งค่าผู้ให้บริการ OAuth (Google, Facebook, Apple) เปิด/ปิดและกรอก Client ID กับ Secret เพื่อเปิดใช้งาน",
        side: "bottom",
      },
    },
  ],

  "/admin/faq": [
    {
      element: '[data-tour="faq-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description:
          "ดูจำนวนคำถามที่พบบ่อยทั้งหมด หรือเพิ่มคำถามใหม่",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="faq-table"]',
      popover: {
        title: "ตารางคำถามที่พบบ่อย",
        description:
          "ดูรายการ FAQ ทั้งหมด แก้ไขคำถาม-คำตอบ เปิด/ปิดการแสดงผล หรือจัดลำดับ",
        side: "top",
      },
    },
  ],

  "/admin/content": [
    {
      element: '[data-tour="content-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description:
          "ค้นหาเนื้อหาจากคีย์หรือค่า ดูตัวอย่าง รีเซ็ต หรือบันทึกการเปลี่ยนแปลงทั้งหมด",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="content-editor"]',
      popover: {
        title: "ตัวแก้ไขเนื้อหา",
        description:
          "แก้ไขข้อความที่แสดงบนเว็บไซต์ เช่น ชื่อหน้า คำอธิบาย และข้อความต่างๆ แบ่งตามหมวดหมู่",
        side: "top",
      },
    },
  ],

  "/admin/theme": [
    {
      element: '[data-tour="theme-controls"]',
      popover: {
        title: "การตั้งค่าธีม",
        description:
          "ปรับแต่งสีหลัก โหมดสี ความโค้งมน สีแถบด้านข้าง และโลโก้ของเว็บไซต์",
        side: "right",
      },
    },
    {
      element: '[data-tour="theme-preview"]',
      popover: {
        title: "ตัวอย่างแบบเรียลไทม์",
        description:
          "ดูตัวอย่างการเปลี่ยนแปลงแบบเรียลไทม์ทั้งในโหมดสว่างและโหมดมืดก่อนบันทึก",
        side: "left",
      },
    },
  ],

  "/admin/contacts": [
    {
      element: '[data-tour="contacts-toolbar"]',
      popover: {
        title: "แถบเครื่องมือ",
        description:
          "กรองข้อความติดต่อตามสถานะ: ทั้งหมด ยังไม่ได้อ่าน หรืออ่านแล้ว",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="contacts-table"]',
      popover: {
        title: "ตารางข้อความติดต่อ",
        description:
          "ดูข้อความที่ส่งเข้ามาจากแบบฟอร์มติดต่อ คลิกเพื่อดูรายละเอียดหรือทำเครื่องหมายว่าอ่านแล้ว",
        side: "top",
      },
    },
  ],

  "/admin/analytics": [
    {
      element: '[data-tour="analytics-stats"]',
      popover: {
        title: "สรุปภาพรวม",
        description:
          "ดูสถิติสรุปของแพลตฟอร์ม: จำนวนผู้ใช้ วิดีโอทั้งหมด วิดีโอที่ใช้งาน และสิทธิ์ทั้งหมด",
        side: "bottom",
      },
    },
    {
      element: '[data-tour="analytics-charts-1"]',
      popover: {
        title: "กราฟยอดนิยมและบทบาท",
        description:
          "กราฟแท่งแสดง 10 วิดีโอยอดนิยม และกราฟวงกลมแสดงสัดส่วนบทบาทผู้ใช้",
        side: "top",
      },
    },
    {
      element: '[data-tour="analytics-charts-2"]',
      popover: {
        title: "กราฟแนวโน้ม",
        description:
          "กราฟเส้นแสดงแนวโน้มการสมัครสมาชิกและการให้สิทธิ์ตามช่วงเวลา",
        side: "top",
      },
    },
  ],
};
