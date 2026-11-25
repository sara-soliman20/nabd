// English quick-check decision tree. Same node ids, same option order and same topic ids as src/data/triage.js.
const call = (title, text, topics) => ({ call: true, title, text, topics })
const info = (title, text, topics) => ({ call: false, title, text, topics })

export const nodesEn = {
  start: { q: 'Does the person respond when you call out and gently shake their shoulders?',
    options: [{ label: 'Yes, they respond', next: 'conscious' }, { label: 'No response', next: 'unresponsive' }] },
  unresponsive: { q: 'Are they breathing normally? Watch the chest for 10 seconds.',
    hint: 'Occasional gasps or groaning are not normal breathing.',
    options: [
      { label: 'Not breathing, or only gasping', result: call('Possible cardiac arrest: start CPR now', 'Call 123 on speaker, ask for an AED, and start chest compressions at the centre of the chest at 100–120 per minute.', ['cpr', 'cpr-child']) },
      { label: 'Breathing normally', result: call('Unconscious but breathing: call the ambulance', 'Place them on their side (recovery position) and keep watching their breathing. Look for the likely cause: head injury, low sugar, poisoning, seizure, fainting or heatstroke.', ['fainting', 'seizure', 'head-injury', 'hypoglycemia', 'poisoning', 'heatstroke']) }] },
  conscious: { q: 'What best describes the main problem?',
    options: [
      { label: 'Cannot speak or breathe, clutching the throat', result: call('Severe choking', 'Give 5 back blows between the shoulder blades then 5 abdominal thrusts (for an infant: back blows and chest thrusts), and call 123.', ['choking', 'choking-infant']) },
      { label: 'Short of breath or wheezing', next: 'breathing' },
      { label: 'Chest pain or pressure', result: call('Suspected heart attack', 'Call 123 immediately, sit them comfortably, and do not let them walk or drive. Aspirin only if there is no reason to avoid it.', ['heart-attack']) },
      { label: 'Drooping face, weak arm or slurred speech', result: call('Suspected stroke', 'Call 123 immediately and note the time the symptoms began. Give no food, drink or medicine.', ['stroke']) },
      { label: 'Bleeding', next: 'bleeding' },
      { label: 'A burn or electric shock', next: 'burn' },
      { label: 'A fall, a blow or bone pain', next: 'injury' },
      { label: 'A sting, a bite, a swallowed substance or gas', next: 'bite' },
      { label: 'Fever, dizziness or severe tiredness', next: 'dizzy' },
      { label: 'Swollen face or a rash after food, medicine or a sting', result: call('Suspected severe allergic reaction', 'If they have an epinephrine pen use it now, call 123 even if they improve, and lay them down.', ['anaphylaxis']) },
      { label: 'Drowning or just pulled out of water', result: call('Drowning', 'Call 123 and check breathing. Everyone who has drowned needs a medical check even if they look fine.', ['drowning']) }] },
  breathing: { q: 'Do they have known asthma or an inhaler?',
    options: [
      { label: 'Yes, they have asthma', result: info('Possible asthma attack', 'Sit them upright and have them use the reliever inhaler: one puff every 30–60 seconds, up to 10 puffs. If there is no improvement or it is severe, call 123.', ['asthma']) },
      { label: 'No, and it started after food, medicine or a sting', result: call('Suspected severe allergic reaction', 'Call 123 immediately, and use an epinephrine pen if one is available.', ['anaphylaxis']) },
      { label: 'No, and it is sudden with chest pain', result: call('Could be a heart attack', 'Call 123 immediately and sit them comfortably.', ['heart-attack']) }] },
  bleeding: { q: 'What does the bleeding look like?',
    options: [
      { label: 'Heavy, spurting or will not stop', result: call('Severe bleeding', 'Press firmly and directly with a clean cloth without lifting it, and call 123.', ['severe-bleeding']) },
      { label: 'From the nose', result: info('Nosebleed', 'Sit leaning forward and pinch the soft part of the nose for 10–15 minutes.', ['nosebleed']) },
      { label: 'A small cut or scrape', result: info('Minor wound', 'Rinse it under running water, cover it, and watch for signs of infection.', ['wounds']) }] },
  burn: { q: 'What kind of injury is it?',
    options: [
      { label: 'A burn from hot water, fire or steam', result: info('Heat burn', 'Cool under running water for 20 minutes. Call the ambulance if the burn is large, on the face, hands or joints, or on a child.', ['burns']) },
      { label: 'A chemical (bleach, acid, cleaner)', result: call('Chemical burn', 'Rinse with plenty of water for 20 minutes, remove contaminated clothing, and call 123.', ['burns', 'poisoning']) },
      { label: 'An electric shock', result: call('Electric shock', 'Cut the power before you touch them. Then check breathing and call 123.', ['electric-shock']) }] },
  injury: { q: 'Where is the injury?',
    options: [
      { label: 'The head', result: info('Head injury', 'Watch them for 24 hours. Loss of consciousness, repeated vomiting or severe drowsiness needs the ambulance.', ['head-injury']) },
      { label: 'A bone or joint (arm, leg, ankle)', result: info('Fracture or sprain', 'Keep the limb still and apply a cold pack. Call the ambulance if the break is open or in the neck, back or thigh.', ['fracture', 'sprain']) },
      { label: 'The eye', result: info('Eye injury', 'For chemicals, rinse for 15–20 minutes. Do not rub, press or remove an embedded object.', ['eye-injury']) }] },
  bite: { q: 'What exactly happened?',
    options: [
      { label: 'A scorpion sting or snake bite', result: call('Venomous bite', 'Keep them calm and still, go straight to the nearest hospital with antivenom, and call 123.', ['venomous-bite']) },
      { label: 'A dog, cat or animal bite', result: info('Animal bite', 'Wash the wound for 15 minutes with soap and water, then go for a rabies shot.', ['animal-bite']) },
      { label: 'Swallowed a substance or medicine, or breathed in gas', result: call('Suspected poisoning', 'Move them into fresh air if it is gas, do not make them vomit, and call 123 with the container ready.', ['poisoning']) }] },
  dizzy: { q: 'Which is closest?',
    options: [
      { label: 'Very hot after sun or heat, and confused', result: call('Heatstroke', 'Move them somewhere cool, cool them with water and a fan, and call 123.', ['heatstroke']) },
      { label: 'Has diabetes and is shaky, sweating and hungry', result: info('Possible low blood sugar', 'If awake give fast sugar (juice or dissolved sugar) and recheck after 15 minutes.', ['hypoglycemia']) },
      { label: 'Dizzy, faint or pale', result: info('Fainting', 'Lay them down with legs raised, loosen tight clothing, and watch their breathing.', ['fainting']) },
      { label: 'Convulsions or shaking of the body', result: info('Seizure', 'Protect them from injury, do not restrain them or put anything in their mouth, and note the time.', ['seizure']) }] },
}
