// Sample training content for local preview mode (`npm run dev:preview`).
// Shared by the PDF generator (demo/dev.mjs, runs in Node) and the in-memory
// seed (demo/seed.js, runs in the browser) so search text matches the slides.

export const DEMO_MATERIALS = [
  {
    id: 'demo-onboarding',
    name: 'Welcome to Revibe: Your First Week',
    category: 'Onboarding',
    daysAgo: 2,
    slides: [
      ['Welcome to Revibe', 'Renewed electronics, like new but waaaay cheaper. This deck walks you through your first week.'],
      ['Our mission', 'Make premium tech affordable and keep millions of devices out of landfill.'],
      ['How we work', 'Customer obsessed. Own the outcome. Move fast, check twice.'],
      ['Your first week', 'Day 1 setup and tools. Day 2 grading standards. Day 3 shadow the quality team.'],
      ['Who to ask', 'Your buddy, your team lead, and the #help-desk channel.'],
      ['You are ready', 'Mark this deck complete and pick your next material from the library.'],
    ],
  },
  {
    id: 'demo-grading',
    name: 'Renewed Grading Standards (Excellent, Good, Fair)',
    category: 'Quality',
    daysAgo: 6,
    slides: [
      ['Grading standards', 'Every device is graded on screen, body, battery and function.'],
      ['Excellent', 'Looks like new. No visible scratches at arm length. Battery above 85 percent.'],
      ['Good', 'Light signs of use. Micro scratches only visible up close.'],
      ['Fair', 'Visible wear on body. Screen free of cracks. Fully functional.'],
      ['Battery health', 'Below 80 percent battery health is replaced before listing.'],
      ['Photo checklist', 'Front, back, four sides, screen on white and screen on black.'],
      ['Common mistakes', 'Grading under poor light and skipping the camera lens check.'],
      ['Quiz yourself', 'Grade the three sample devices with your team lead.'],
    ],
  },
  {
    id: 'demo-diagnostics',
    name: 'Device Diagnostics Checklist',
    category: 'Technical',
    daysAgo: 9,
    slides: [
      ['Diagnostics checklist', 'Run every check in order and log results in the tracker.'],
      ['Power and charging', 'Cable charge, wireless charge, and battery cycle count.'],
      ['Display', 'Dead pixels, touch grid test, True Tone and brightness range.'],
      ['Cameras', 'Front, wide, ultra wide, focus, flash and Face ID.'],
      ['Audio', 'Earpiece, loudspeaker, microphones and vibration motor.'],
      ['Connectivity', 'Wi-Fi, Bluetooth, SIM detection, GPS and NFC.'],
      ['Sign off', 'Two person sign off for any device graded Excellent.'],
    ],
  },
  {
    id: 'demo-customer-care',
    name: 'Customer Care Playbook',
    category: 'Customer Care',
    daysAgo: 13,
    slides: [
      ['Customer care playbook', 'Every conversation should leave the customer happier than before.'],
      ['Tone of voice', 'Friendly, clear and human. Skip the jargon.'],
      ['First response', 'Reply within one hour during working hours.'],
      ['Handling returns', 'Ten days to return, no awkward questions.'],
      ['Warranty claims', 'Twelve months warranty on every renewed device.'],
      ['Escalation', 'Escalate to a team lead after two failed resolutions.'],
    ],
  },
  {
    id: 'demo-warranty',
    name: 'Returns & Warranty Policy',
    category: 'Policies',
    daysAgo: 20,
    slides: [
      ['Returns and warranty', 'What customers are entitled to and how we process it.'],
      ['10 day returns', 'Full refund within ten days of delivery for any reason.'],
      ['12 month warranty', 'Covers hardware faults that are not caused by damage.'],
      ['Not covered', 'Liquid damage, cracked screens after delivery, unauthorised repairs.'],
      ['Processing', 'Log the case, book pickup, inspect within 48 hours.'],
    ],
  },
  {
    id: 'demo-battery',
    name: 'iPhone Battery Health Essentials',
    category: 'Technical',
    daysAgo: 27,
    slides: [
      ['Battery health essentials', 'How to read, test and explain battery health.'],
      ['Maximum capacity', 'Shown in Settings. Our minimum for listing is 80 percent.'],
      ['Cycle count', 'Check cycle count in the diagnostics tool, not just capacity.'],
      ['Replacement', 'Use certified parts and recalibrate after replacement.'],
      ['Explaining it', 'Tell customers what the number means for their day to day use.'],
    ],
  },
  {
    id: 'demo-express',
    name: 'Revibe Express Delivery Operations',
    category: 'Operations',
    daysAgo: 34,
    slides: [
      ['Revibe Express', 'Same day delivery for in stock devices in Dubai and Abu Dhabi.'],
      ['Order cut off', 'Orders before 2pm ship the same day.'],
      ['Packing', 'Device, cable, SIM tool and the Revibe card in every box.'],
      ['Handover', 'Scan, photo and customer signature on delivery.'],
      ['Exceptions', 'Failed delivery is rebooked within 24 hours.'],
      ['Metrics', 'On time rate, first attempt success and customer rating.'],
    ],
  },
  {
    id: 'demo-security',
    name: 'Data Wipe & Security Protocol',
    category: 'Policies',
    daysAgo: 41,
    slides: [
      ['Data wipe protocol', 'Every device is wiped to industry standard before resale.'],
      ['Activation lock', 'Confirm Find My and Google lock are removed.'],
      ['Certified wipe', 'Run the certified wipe tool and save the report.'],
      ['Verification', 'Boot to setup screen and confirm no accounts remain.'],
      ['Never', 'Never browse, copy or keep customer data. Zero exceptions.'],
    ],
  },
];

/** Search text per page, in the same shape the uploader stores (textContent). */
export function textContentFor(material) {
  return material.slides.map(([title, body], i) => ({ page: i + 1, text: `${title} ${body}` }));
}
