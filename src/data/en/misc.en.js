export const kitGroupsEn = [
  { title: 'Wounds & dressings', items: ['Sterile gauze in different sizes', 'Adhesive plasters in several sizes', 'Gauze bandage and an elastic pressure bandage', 'Medical tape', 'Sterile non-stick burn dressings', 'A triangular cloth bandage for a splint or sling'] },
  { title: 'Tools', items: ['Medical gloves (single use)', 'Medical scissors', 'Tweezers', 'Safety pins', 'A thermometer', 'Instant cold packs', 'A survival blanket (foil)', 'A CPR face shield or mask', 'A small torch and spare batteries'] },
  { title: 'Cleaning & care', items: ['Liquid soap', 'Sterile saline to rinse wounds and eyes', 'A skin antiseptic (such as povidone-iodine)', 'Antibiotic ointment for minor wounds', 'Cream for minor burns, as the pharmacist advises'] },
  { title: 'Common medicines (ask your pharmacist)', items: ['Fever reducer and painkiller (paracetamol) at a dose suitable for the age', 'Oral rehydration salts', 'An antihistamine for mild allergies', 'Glucose tablets or sugar for low blood sugar', 'Any medicine family members take regularly'] },
  { title: 'For the family', items: ['An epinephrine pen for anyone prescribed one', 'An asthma reliever inhaler and a spacer', 'A list of each person’s medicines, conditions and allergies', 'A sheet with emergency numbers and the family doctor', 'Dosing instructions for children from the doctor'] },
]

export const numbersEn = [
  { n: '123', label: 'Ambulance', note: 'Medical emergencies and accidents', main: true },
  { n: '122', label: 'Police', note: 'Accidents and assaults' },
  { n: '180', label: 'Fire & civil defence', note: 'Fires and rescue' },
  { n: '129', label: 'Gas emergency', note: 'Natural gas leaks' },
  { n: '121', label: 'Electricity emergency', note: 'Faults and exposed wires' },
]
export const callScriptEn = [
  'Say exactly where you are: governorate, street, the nearest landmark, and the floor or flat if needed.',
  'Say briefly what happened: “A man collapsed and is not breathing” or “A child is choking on food.”',
  'Give the number of injured people, and whether they are awake and breathing.',
  'Give your phone number, and do not hang up until the operator ends the call; they may guide you through steps that save a life.',
  'Ask someone to wait at the entrance of the building or on the street to guide the ambulance.',
]
export const sceneSafetyEn = [
  ['Your safety first', 'Check the scene is safe: no fire, electricity, gas or traffic. You help nobody if you become a casualty too.'],
  ['Do they respond?', 'Call out loudly and gently shake their shoulders. For an infant, tap the sole of the foot.'],
  ['Call for help', 'Call 123 on speaker and ask a bystander to bring an AED.'],
  ['Breathing', 'Look at the chest for 10 seconds. If they are not breathing or only gasp, start CPR immediately.'],
  ['Bleeding', 'If there is heavy bleeding, press directly on it first.'],
]

export const booksEn = {
  'erc-first-aid-guide': {
    title: 'First Aid Guide – Egyptian Red Crescent',
    publisher: 'Egyptian Red Crescent (a copy uploaded to Scribd)',
    note: 'The first aid course guide. Scribd may ask you to sign in to read it in full.',
  },
  'tanta-first-aid-book': {
    title: 'First Aid Book – Crisis & Disaster Management Unit, Tanta University',
    publisher: 'Tanta University – Faculty of Pharmacy (scientific material compiled by Dr. Nabawia Sharaf El-Din, 2012)',
    note: 'A 32-page PDF file.',
    caution: 'A compiled text from 2012. Some of its advice does not match current guidance (for example snake bites, inducing vomiting in poisoning, and some burn and medicine tips). Use it for reading only, and rely on the Nabd library or a trained first aider.',
  },
}
