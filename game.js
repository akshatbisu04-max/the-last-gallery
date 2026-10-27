/* THE LAST GALLERY — original browser mystery game
   Built with vanilla HTML, CSS and JavaScript. Progress is stored locally. */
(() => {
  'use strict';

  const SAVE_KEY = 'nocturne-last-gallery-v1';
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    title: $('#title-screen'), game: $('#game-screen'), newGame: $('#new-game'), continue: $('#continue-game'),
    how: $('#how-to-play'), howModal: $('#how-modal'), locationNav: $('#location-nav'), sceneArt: $('#scene-art'),
    sceneLocation: $('#scene-location'), sceneTime: $('#scene-time'), sceneCaption: $('#scene-caption'),
    sceneKicker: $('#scene-kicker'), sceneTitle: $('#scene-title'), sceneText: $('#scene-text'), choices: $('#choice-list'),
    progressLabel: $('#progress-label'), progressBar: $('#progress-bar'), suspectList: $('#suspect-list'),
    evidenceCount: $('#evidence-count'), journalCount: $('#journal-count'), recentEvidence: $('#recent-evidence'),
    suspectTotal: $('#suspect-total'), clueFlash: $('#clue-flash'), drawerBackdrop: $('#drawer-backdrop'),
    evidenceDrawer: $('#evidence-drawer'), journalDrawer: $('#journal-drawer'), evidenceGrid: $('#evidence-grid'),
    emptyEvidence: $('#empty-evidence'), boardCount: $('#board-count'), journalContent: $('#journal-content'),
    dialogBackdrop: $('#dialog-backdrop'), dialog: $('#dialog'), toast: $('#toast'), sound: $('#sound-toggle'),
  };

  const locations = [
    { id: 'gallery', name: 'The Grand Gallery', short: 'Grand Gallery', number: '01', caption: 'THE BLUE HOUR', time: '11:47 PM' },
    { id: 'security', name: 'Security Room', short: 'Security Room', number: '02', caption: 'A ROOM WITH NO WINDOWS', time: '11:56 PM', unlock: 'gallery_seen' },
    { id: 'office', name: 'Curator’s Office', short: 'Curator’s Office', number: '03', caption: 'PAPER TRAILS', time: '12:08 AM', unlock: 'office_open' },
    { id: 'corridor', name: 'North Corridor', short: 'North Corridor', number: '04', caption: 'THE QUIET WING', time: '12:19 AM', unlock: 'security_seen' },
    { id: 'conservatory', name: 'Glass Conservatory', short: 'Conservatory', number: '05', caption: 'AFTER THE RAIN', time: '12:31 AM', unlock: 'corridor_seen' },
    { id: 'vault', name: 'Restoration Vault', short: 'Restoration Vault', number: '06', caption: 'BEHIND THE FRAME', time: '12:44 AM', unlock: 'vault_open' },
  ];

  const suspects = [
    { id: 'mara', name: 'Mara Vale', role: 'Curator', initials: 'M', style: '', note: 'Protective of the museum. Her gallery key was signed out tonight.' },
    { id: 'elliot', name: 'Elliot Reed', role: 'Night guard', initials: 'E', style: 'alt', note: 'Knows every camera blind spot. Says he never left the security room.' },
    { id: 'celine', name: 'Celine Ardent', role: 'Guest artist', initials: 'C', style: 'warm', note: 'The last guest in the north wing. A painting of hers is on loan.' },
  ];

  const evidence = {
    cutWire: { title: 'Cut camera wire', symbol: '⌁', description: 'A clean cut, made with a sharp tool. The break is too neat for an accident.', source: 'Security Room' },
    wetPrint: { title: 'A wet shoeprint', symbol: '◉', description: 'Fine greenhouse soil is pressed into the heel. The print points toward the north corridor.', source: 'North Corridor' },
    ledger: { title: 'Altered loan ledger', symbol: '▤', description: 'A restoration entry was added after the ledger had already been signed.', source: 'Curator’s Office' },
    blueThread: { title: 'Blue silk thread', symbol: '⌁', description: 'A bright thread caught on the frame. It matches the lining of a formal coat.', source: 'The Grand Gallery' },
    keyTag: { title: 'Service key tag', symbol: '⚿', description: 'A brass tag marked R-4. The key itself is missing from the night register.', source: 'Security Room' },
    greenhouseSoil: { title: 'Fresh greenhouse soil', symbol: '✿', description: 'The potting mix is damp, though the greenhouse door was locked from the inside.', source: 'Glass Conservatory' },
    letter: { title: 'Unsent letter', symbol: '✉', description: 'A note asks for the Blue Hour to be moved before morning. The signature was torn away.', source: 'Curator’s Office' },
    falseBack: { title: 'A hollow backing', symbol: '▣', description: 'The frame is heavier on one side. Its backing has been opened and resealed.', source: 'Restoration Vault' },
  };

  const freshState = () => ({ scene: 'intro', location: 'gallery', clues: [], flags: [], journal: [], questioned: [], seenScenes: [], ending: null, muted: true });
  let state = freshState();
  let toastTimer;
  let audioContext;

  // The story is data-driven: each choice points to another scene and may add evidence or a flag.
  const scenes = {
    intro: {
      location: 'gallery', kicker: 'CASE BRIEFING', title: 'The Blue Hour',
      text: `<p>At 11:47 PM, the storm cuts the power to the Asterion Museum. When the backup lights return, the Blue Hour—a small, priceless painting—has vanished from its frame.</p><p>Three people were inside the north wing. The doors are still locked. Detective, the night is yours.</p>`,
      choices: [
        { label: 'Inspect the empty frame', next: 'frame', clue: 'blueThread', clueMessage: 'CLUE FOUND · Blue silk thread', journal: 'You begin at the empty frame. A strand of blue silk catches against its lower edge.' },
        { label: 'Speak with Mara, the curator', next: 'mara_gallery', question: 'mara', journal: 'Mara says the painting was secure when she checked the gallery at 11:30.' },
      ],
    },
    frame: {
      location: 'gallery', kicker: 'EXAMINING EVIDENCE', title: 'A frame left behind',
      text: `<p>The glass is intact. The canvas was removed carefully, not ripped. Near the lower corner, a thread of blue silk clings to a small nick in the gilding.</p><p>The frame feels oddly heavy on its left side. Whoever took the painting knew exactly how it was mounted.</p>`,
      choices: [
        { label: 'Bag the silk thread', next: 'frame_bagged', clue: 'blueThread', clueMessage: 'CLUE LOGGED · Blue silk thread', journal: 'A blue silk thread is caught on the gilded frame. It may connect the thief to someone in the wing.' },
        { label: 'Ask Mara about the frame', next: 'mara_frame', question: 'mara', journal: 'Mara insists the frame was never touched during tonight’s checks.' },
        { label: 'Check the security room', next: 'security_intro', flag: 'gallery_seen' },
      ],
    },
    frame_bagged: { location: 'gallery', kicker: 'CLUE SECURED', title: 'A thread to follow', text: `<p>You slide the silk into an evidence sleeve. A faint trace of rainwater darkens the gilding where the thread was snagged.</p><p>There is more to learn elsewhere in the wing.</p>`, choices: [{ label: 'Question Mara', next: 'mara_gallery', question: 'mara' }, { label: 'Head to the security room', next: 'security_intro', flag: 'gallery_seen' }] },
    mara_gallery: {
      location: 'gallery', kicker: 'INTERVIEW · MARA VALE', title: 'The curator’s account',
      text: `<p>“I locked the gallery myself,” Mara says, keeping her eyes on the empty frame. She is composed, but her hand tightens around a silver key ring.</p><p>When you mention the storm, she says the backup generator should have kept the cameras running. She does not explain why they did not.</p>`,
      choices: [
        { label: 'Ask about the camera outage', next: 'mara_cameras', question: 'mara', flag: 'mara_cameras' },
        { label: 'Ask about tonight’s guests', next: 'mara_guests', question: 'mara' },
        { label: 'Move on to the security room', next: 'security_intro', flag: 'gallery_seen' },
      ],
    },
    mara_frame: { location: 'gallery', kicker: 'INTERVIEW · MARA VALE', title: 'A careful denial', text: `<p>Mara studies the frame for a beat too long. “The painting was checked at closing. Nothing was wrong then.”</p><p>She remembers signing out the restoration key, but says she returned it before the storm.</p>`, choices: [{ label: 'Ask where the key was returned', next: 'mara_key', question: 'mara' }, { label: 'Search another room', next: 'security_intro', flag: 'gallery_seen' }] },
    mara_cameras: { location: 'gallery', kicker: 'INTERVIEW · MARA VALE', title: 'A power cut', text: `<p>“The generator is old,” she says. “It has failed before.” Yet the museum’s maintenance log shows no recent fault.</p><p>She looks toward the north corridor when you ask who had access to the camera cabinet.</p>`, choices: [{ label: 'Press her about the corridor', next: 'mara_corridor', question: 'mara' }, { label: 'Check the camera cabinet', next: 'security_intro', flag: 'gallery_seen' }] },
    mara_guests: { location: 'gallery', kicker: 'INTERVIEW · MARA VALE', title: 'Three people after closing', text: `<p>Mara, night guard Elliot Reed, and guest artist Celine Ardent were still in the museum after closing. Celine had been working in the conservatory, she says.</p><p>“No one had a reason to take the Blue Hour.” The answer comes too quickly.</p>`, choices: [{ label: 'Ask about Celine’s painting', next: 'mara_art', question: 'mara' }, { label: 'Find Elliot in security', next: 'security_intro', flag: 'gallery_seen' }] },
    mara_art: { location: 'gallery', kicker: 'INTERVIEW · MARA VALE', title: 'The other blue painting', text: `<p>Celine’s work is on loan from a private collection. Mara says it has nothing to do with the theft, then adds that the restoration vault has been locked all evening.</p><p>That is a very specific detail to offer without being asked.</p>`, choices: [{ label: 'Visit the curator’s office', next: 'office_intro', flag: 'office_open' }, { label: 'Look for Celine', next: 'conservatory_intro', flag: 'corridor_seen' }] },
    mara_key: { location: 'gallery', kicker: 'INTERVIEW · MARA VALE', title: 'The missing key', text: `<p>“I left it in the office drop box.” Mara says Elliot has the only other set. She offers to show you the sign-out ledger.</p><p>The office is locked, but the curator carries the brass key.</p>`, choices: [{ label: 'Visit the curator’s office', next: 'office_intro', flag: 'office_open' }, { label: 'Check the security room first', next: 'security_intro', flag: 'gallery_seen' }] },
    mara_corridor: { location: 'gallery', kicker: 'INTERVIEW · MARA VALE', title: 'A glance down the hall', text: `<p>“The conservatory door sticks,” Mara says. “You can hear it from the gallery.” Her answer is practical, but she has just told you she never left this room.</p>`, choices: [{ label: 'Question the guard', next: 'security_intro', flag: 'gallery_seen' }, { label: 'Follow the north corridor', next: 'corridor_intro', flag: 'security_seen' }] },
    security_intro: { location: 'security', kicker: 'LOCATION UNLOCKED', title: 'The blind spot', text: `<p>The security room smells of warm dust and wet wool. Elliot Reed stands beside a bank of dark monitors. One camera feed has been looped; another ends in static.</p><p>He says the storm took the system offline. A severed wire at the cabinet suggests otherwise.</p>`, choices: [{ label: 'Inspect the camera cabinet', next: 'security_wire' }, { label: 'Question Elliot', next: 'elliot_interview', question: 'elliot' }, { label: 'Check the key register', next: 'security_key' }] },
    security_wire: { location: 'security', kicker: 'EXAMINING EVIDENCE', title: 'A deliberate cut', text: `<p>The camera cable has been cut cleanly, then tucked behind the panel. This was done before the outage, by someone who knew which feed covered the gallery.</p>`, choices: [{ label: 'Collect the wire fragment', next: 'security_wire_bag', clue: 'cutWire', clueMessage: 'CLUE FOUND · Cut camera wire', journal: 'A camera cable was cut cleanly before the outage. The thief knew the camera layout.' }, { label: 'Ask Elliot about the cabinet', next: 'elliot_wire', question: 'elliot' }] },
    security_wire_bag: { location: 'security', kicker: 'CLUE SECURED', title: 'A clean cut', text: `<p>The wire fragment is bagged. The cut is smooth, made by a narrow blade—not a rough tool from the maintenance bench.</p>`, choices: [{ label: 'Question Elliot', next: 'elliot_interview', question: 'elliot' }, { label: 'Search the key register', next: 'security_key' }] },
    security_key: { location: 'security', kicker: 'EXAMINING EVIDENCE', title: 'The night register', text: `<p>The register lists two keys for the north wing. One was signed back in at 11:20. The second entry is blank, though the brass tag is still hanging on its hook.</p>`, choices: [{ label: 'Photograph the missing key tag', next: 'security_tag_bag', clue: 'keyTag', clueMessage: 'CLUE FOUND · Service key tag', journal: 'The service key for the north wing is missing from the register. Its tag is still on the hook.' }, { label: 'Ask Elliot about the register', next: 'elliot_key', question: 'elliot' }] },
    security_tag_bag: { location: 'security', kicker: 'CLUE SECURED', title: 'An empty hook', text: `<p>You photograph the empty space in the register beside the R-4 tag. The missing key opens the restoration vault.</p>`, choices: [{ label: 'Question Elliot', next: 'elliot_interview', question: 'elliot' }, { label: 'Follow the corridor', next: 'corridor_intro', flag: 'security_seen' }] },
    elliot_interview: { location: 'security', kicker: 'INTERVIEW · ELLIOT REED', title: 'The guard’s alibi', text: `<p>Elliot says he stayed in the security room throughout the outage. He was watching the feeds, he claims, though the camera logs show a gap of eleven minutes.</p><p>When you ask about the gallery, his answer is immediate: “I never went near the painting.”</p>`, choices: [{ label: 'Ask about the missing key', next: 'elliot_key_answer', question: 'elliot' }, { label: 'Ask about the cut wire', next: 'elliot_wire', question: 'elliot' }, { label: 'Move toward the north corridor', next: 'corridor_intro', flag: 'security_seen' }] },
    elliot_wire: { location: 'security', kicker: 'INTERVIEW · ELLIOT REED', title: 'A practiced answer', text: `<p>“The storm did that,” Elliot says. You point out the clean cut. He rubs a pale line on his thumb and says nothing for a moment.</p><p>His toolbox is missing a small pair of electrician’s shears.</p>`, choices: [{ label: 'Log the missing tool', next: 'elliot_tool_note', journal: 'Elliot’s toolbox is missing a pair of narrow electrician’s shears.' }, { label: 'Follow the north corridor', next: 'corridor_intro', flag: 'security_seen' }] },
    elliot_tool_note: { location: 'security', kicker: 'CASE NOTE', title: 'A missing tool', text: `<p>You note the missing shears. It is suspicious, but it is not proof. You need to establish where the thief went after leaving the gallery.</p>`, choices: [{ label: 'Check the corridor', next: 'corridor_intro', flag: 'security_seen' }, { label: 'Inspect the key register', next: 'security_key' }] },
    elliot_key: { location: 'security', kicker: 'INTERVIEW · ELLIOT REED', title: 'A key he did not sign out', text: `<p>Elliot says the restoration key was returned earlier. He cannot say who returned it. His eyes stay on the blank line in the register.</p>`, choices: [{ label: 'Ask about his eleven-minute gap', next: 'elliot_gap', question: 'elliot' }, { label: 'Search the corridor', next: 'corridor_intro', flag: 'security_seen' }] },
    elliot_key_answer: { location: 'security', kicker: 'INTERVIEW · ELLIOT REED', title: 'The service key', text: `<p>He says the curator signed for it. The register says nothing of the kind. When you point this out, Elliot claims the page must have been smudged.</p>`, choices: [{ label: 'Inspect the register closely', next: 'security_key' }, { label: 'Ask about the camera gap', next: 'elliot_gap', question: 'elliot' }] },
    elliot_gap: { location: 'security', kicker: 'INTERVIEW · ELLIOT REED', title: 'Eleven minutes', text: `<p>Elliot says the system clock drifts during storms. It does not explain why the camera loop begins at 11:36—before the power failed.</p><p>He has answered every question with a different version of the same story.</p>`, choices: [{ label: 'Search the north corridor', next: 'corridor_intro', flag: 'security_seen' }, { label: 'Return to the gallery', next: 'frame' }] },
    corridor_intro: { location: 'corridor', kicker: 'LOCATION UNLOCKED', title: 'A trail in the dust', text: `<p>The north corridor is dim and narrow. Rain taps against the high windows. A wet shoeprint breaks the film of dust near the service door and points toward the conservatory.</p>`, choices: [{ label: 'Photograph the print', next: 'corridor_print', clue: 'wetPrint', clueMessage: 'CLUE FOUND · A wet shoeprint', journal: 'A wet print with greenhouse soil leads from the service door toward the conservatory.' }, { label: 'Check the service door', next: 'corridor_door' }, { label: 'Go to the conservatory', next: 'conservatory_intro' }] },
    corridor_print: { location: 'corridor', kicker: 'CLUE SECURED', title: 'Soil from the glasshouse', text: `<p>The heel has a distinctive split at the edge. Damp potting soil fills the tread. The conservatory door is just ahead.</p>`, choices: [{ label: 'Search the conservatory', next: 'conservatory_intro' }, { label: 'Inspect the service door', next: 'corridor_door' }] },
    corridor_door: { location: 'corridor', kicker: 'EXAMINING EVIDENCE', title: 'The service entrance', text: `<p>The lock is intact, but a narrow scratch runs below the handle. It looks like a key was slipped into the gap and turned from the other side.</p><p>On the floor, a fleck of damp soil catches the light.</p>`, choices: [{ label: 'Follow the soil toward the glasshouse', next: 'conservatory_intro' }, { label: 'Return to the security room', next: 'security_intro' }] },
    conservatory_intro: { location: 'conservatory', kicker: 'LOCATION UNLOCKED', title: 'The glass conservatory', text: `<p>Warm, damp air fogs your glasses. The conservatory door is latched from the inside. Celine Ardent stands beside a worktable, brushes laid out in a neat row.</p><p>A tray of potting soil has been disturbed. One pair of shoes beside it is still wet.</p>`, choices: [{ label: 'Inspect the potting bench', next: 'conservatory_soil' }, { label: 'Question Celine', next: 'celine_interview', question: 'celine' }, { label: 'Ask about the locked door', next: 'celine_door', question: 'celine' }] },
    conservatory_soil: { location: 'conservatory', kicker: 'EXAMINING EVIDENCE', title: 'Freshly disturbed', text: `<p>The soil is damp and newly scattered. A few grains have been carried out onto the stone floor. Beside the tray is a short blue fibre, much darker than the thread from the frame.</p>`, choices: [{ label: 'Collect a soil sample', next: 'conservatory_sample', clue: 'greenhouseSoil', clueMessage: 'CLUE FOUND · Fresh greenhouse soil', journal: 'Damp soil on the potting bench matches the grains in the corridor print.' }, { label: 'Question Celine about the soil', next: 'celine_soil', question: 'celine' }] },
    conservatory_sample: { location: 'conservatory', kicker: 'CLUE SECURED', title: 'A trail between rooms', text: `<p>The soil matches the damp print in the corridor. Someone crossed from here to the north wing during the storm.</p>`, choices: [{ label: 'Question Celine', next: 'celine_interview', question: 'celine' }, { label: 'Visit the curator’s office', next: 'office_intro', flag: 'office_open' }] },
    celine_interview: { location: 'conservatory', kicker: 'INTERVIEW · CELINE ARDENT', title: 'The guest artist', text: `<p>Celine says she stayed in the conservatory to finish a study. She heard the alarm, but did not leave the room. Her coat, she says, has been hanging here since dinner.</p><p>When you mention the Blue Hour, she asks whether the painting has been found.</p>`, choices: [{ label: 'Ask about her coat', next: 'celine_coat', question: 'celine' }, { label: 'Ask what she heard', next: 'celine_heard', question: 'celine' }, { label: 'Search the curator’s office', next: 'office_intro', flag: 'office_open' }] },
    celine_door: { location: 'conservatory', kicker: 'INTERVIEW · CELINE ARDENT', title: 'A locked door', text: `<p>“It sticks. I keep it latched so the humidity stays steady.” She demonstrates the latch. A damp shoeprint is visible beneath the handle, facing out toward the corridor.</p>`, choices: [{ label: 'Photograph the print outside', next: 'corridor_intro', flag: 'corridor_seen' }, { label: 'Ask about the shoes', next: 'celine_shoes', question: 'celine' }] },
    celine_soil: { location: 'conservatory', kicker: 'INTERVIEW · CELINE ARDENT', title: 'A careful answer', text: `<p>Celine says she moved the soil tray after the alarm, though it is dry around the rim and wet in the center. She glances at a blue coat hanging behind her.</p>`, choices: [{ label: 'Ask about the blue coat', next: 'celine_coat', question: 'celine' }, { label: 'Look for the curator’s records', next: 'office_intro', flag: 'office_open' }] },
    celine_coat: { location: 'conservatory', kicker: 'INTERVIEW · CELINE ARDENT', title: 'The blue lining', text: `<p>The coat is a deep indigo, lined with silk. A small snag near the cuff is fresh. Celine says it caught on a rose thorn earlier tonight.</p><p>There are no roses in the conservatory.</p>`, choices: [{ label: 'Note the snag and thread', next: 'celine_thread_note', journal: 'Celine’s indigo coat has a fresh snag near its cuff. The silk resembles the fibre at the frame.' }, { label: 'Ask about her alibi', next: 'celine_heard', question: 'celine' }] },
    celine_thread_note: { location: 'conservatory', kicker: 'CASE NOTE', title: 'A familiar blue', text: `<p>The thread at the gallery frame may have come from Celine’s coat. It is a connection, not a conclusion. You still need to find where the painting went.</p>`, choices: [{ label: 'Visit the restoration vault', next: 'vault_intro', flag: 'vault_open' }, { label: 'Search the curator’s office', next: 'office_intro', flag: 'office_open' }] },
    celine_shoes: { location: 'conservatory', kicker: 'INTERVIEW · CELINE ARDENT', title: 'Wet soles', text: `<p>“The rain blew in when I opened the window,” Celine says. But the windows are sealed, and the latch is painted over. Her shoes leave a fine trail of soil toward the corridor.</p>`, choices: [{ label: 'Follow the trail', next: 'corridor_intro', flag: 'corridor_seen' }, { label: 'Search the office', next: 'office_intro', flag: 'office_open' }] },
    celine_heard: { location: 'conservatory', kicker: 'INTERVIEW · CELINE ARDENT', title: 'What she heard', text: `<p>She heard a door close, then footsteps heading toward the service corridor. She says it happened after the lights came back. The floor dust suggests the footsteps came before.</p>`, choices: [{ label: 'Check the corridor', next: 'corridor_intro', flag: 'corridor_seen' }, { label: 'Visit the curator’s office', next: 'office_intro', flag: 'office_open' }] },
    office_intro: { location: 'office', kicker: 'LOCATION UNLOCKED', title: 'The curator’s office', text: `<p>The office is immaculate in the way a room becomes when someone has recently tried to hide a mess. A drawer stands slightly ajar. The loan ledger lies open beside a cup of cold tea.</p>`, choices: [{ label: 'Inspect the loan ledger', next: 'office_ledger' }, { label: 'Search the desk drawer', next: 'office_letter' }, { label: 'Question Mara about the office', next: 'mara_office', question: 'mara' }] },
    office_ledger: { location: 'office', kicker: 'EXAMINING EVIDENCE', title: 'An entry after closing', text: `<p>The Blue Hour was marked for restoration at 9:10 PM, then crossed out. A second entry, in different ink, says “frame inspection — 11:30”. The curator’s signature is on both.</p>`, choices: [{ label: 'Photograph the altered entry', next: 'office_ledger_bag', clue: 'ledger', clueMessage: 'CLUE FOUND · Altered loan ledger', journal: 'The ledger has a late, altered entry for a frame inspection at 11:30.' }, { label: 'Look through the desk drawer', next: 'office_letter' }] },
    office_ledger_bag: { location: 'office', kicker: 'CLUE SECURED', title: 'Two inks', text: `<p>The added entry is still tacky. Whoever wrote it wanted a reason to handle the painting shortly before closing.</p>`, choices: [{ label: 'Search the drawer', next: 'office_letter' }, { label: 'Visit the restoration vault', next: 'vault_intro', flag: 'vault_open' }] },
    office_letter: { location: 'office', kicker: 'EXAMINING EVIDENCE', title: 'The unsent letter', text: `<p>Under a stack of catalogues is an unsent note: “Move the Blue Hour before the trustees arrive. The frame cannot be opened in public.” The signature has been torn away.</p>`, choices: [{ label: 'Bag the note', next: 'office_letter_bag', clue: 'letter', clueMessage: 'CLUE FOUND · Unsent letter', journal: 'A torn, unsigned note asks for the Blue Hour to be moved before morning.' }, { label: 'Take the note to Mara', next: 'mara_office', question: 'mara' }] },
    office_letter_bag: { location: 'office', kicker: 'CLUE SECURED', title: 'A message without a name', text: `<p>The note implies the painting was moved before the theft was discovered. The handwriting is slanted, with a sharp final stroke.</p>`, choices: [{ label: 'Question Mara about the note', next: 'mara_office', question: 'mara' }, { label: 'Search the restoration vault', next: 'vault_intro', flag: 'vault_open' }] },
    mara_office: { location: 'office', kicker: 'INTERVIEW · MARA VALE', title: 'The ledger and the letter', text: `<p>Mara admits the trustees planned to move the painting in the morning, but denies writing the note. She says the frame needed no inspection.</p><p>“The Blue Hour is still in the building,” she says, then corrects herself: “It must be.”</p>`, choices: [{ label: 'Ask about the vault key', next: 'mara_vault', question: 'mara' }, { label: 'Search the vault', next: 'vault_intro', flag: 'vault_open' }] },
    mara_vault: { location: 'office', kicker: 'INTERVIEW · MARA VALE', title: 'A key gone missing', text: `<p>Mara says the vault is opened with a service key and a code known only to staff. She gives you the code without hesitation: 0419.</p><p>It is the date printed on the loan ledger beside the altered entry.</p>`, choices: [{ label: 'Go to the restoration vault', next: 'vault_intro', flag: 'vault_open' }, { label: 'Return to security for the key tag', next: 'security_intro' }] },
    vault_intro: { location: 'vault', kicker: 'LOCATION UNLOCKED', title: 'The restoration vault', text: `<p>The vault door stands ajar. A faint line of blue pigment marks the handle. Inside, framed works rest in felt-lined racks, their labels turned toward the wall.</p><p>One empty slot has a fresh outline in the dust.</p>`, choices: [{ label: 'Inspect the false backing', next: 'vault_backing' }, { label: 'Search the racks', next: 'vault_racks' }, { label: 'Check the vault lock', next: 'vault_lock' }] },
    vault_backing: { location: 'vault', kicker: 'EXAMINING EVIDENCE', title: 'A frame within a frame', text: `<p>A spare frame has been stored face down. Its backing has been opened and carefully resealed. The dust beneath it is disturbed, and a sliver of blue canvas is caught in the seam.</p>`, choices: [{ label: 'Collect the backing fragment', next: 'vault_backing_bag', clue: 'falseBack', clueMessage: 'CLUE FOUND · A hollow backing', journal: 'A false frame backing has been opened and resealed. A fragment of blue canvas remains in the seam.' }, { label: 'Search the empty rack', next: 'vault_racks' }] },
    vault_backing_bag: { location: 'vault', kicker: 'CLUE SECURED', title: 'The hiding place', text: `<p>The hollow frame is large enough to conceal the Blue Hour. Its backing was opened from inside the vault, with no sign of forced entry.</p><p>Someone with the right key and code brought the painting here.</p>`, choices: [{ label: 'Search the racks', next: 'vault_racks' }, { label: 'Review the evidence board', action: 'evidence' }] },
    vault_racks: { location: 'vault', kicker: 'SEARCHING THE VAULT', title: 'A space in the dust', text: `<p>One slot is empty, but a thin stripe of blue pigment marks the shelf below it. The frame was moved recently. The painting is no longer here.</p>`, choices: [{ label: 'Examine the vault lock', next: 'vault_lock' }, { label: 'Make your accusation', action: 'accuse' }] },
    vault_lock: { location: 'vault', kicker: 'EXAMINING EVIDENCE', title: 'No sign of force', text: `<p>The lock is undamaged. Whoever opened the vault used the right key and knew the code. A fine, fresh scratch beside the keypad suggests the code was tried twice.</p>`, choices: [{ label: 'Search the racks', next: 'vault_racks' }, { label: 'Review your evidence', action: 'evidence' }] },
  };

  function hasFlag(flag) { return !flag || state.flags.includes(flag); }
  function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); updateContinue(); }
  function load() { try { const parsed = JSON.parse(localStorage.getItem(SAVE_KEY)); if (parsed && Array.isArray(parsed.clues) && parsed.scene) return { ...freshState(), ...parsed }; } catch (_) { /* Ignore malformed browser save. */ } return null; }
  function updateContinue() { ui.continue.hidden = !localStorage.getItem(SAVE_KEY); }
  function startGame(continueExisting = false) { if (continueExisting) state = load() || freshState(); else { state = freshState(); addJournal('11:47 PM · THE GRAND GALLERY', 'The storm has taken the lights. The Blue Hour is missing. Three people remain in the museum.'); } save(); showScreen('game'); render(); }
  function showScreen(which) { ui.title.classList.toggle('active', which === 'title'); ui.game.classList.toggle('active', which === 'game'); if (which === 'game') ui.game.classList.add('screen-fade'); }
  function addJournal(title, text) { state.journal.push({ title, text }); }
  function visitScene(id) {
    const scene = scenes[id]; if (!scene) return;
    state.scene = id; state.location = scene.location;
    if (!state.seenScenes.includes(id)) state.seenScenes.push(id);
    if (!state.seenScenes.includes(`visit_${scene.location}`)) { state.seenScenes.push(`visit_${scene.location}`); const place = locations.find((item) => item.id === scene.location); if (place) addJournal(`${place.time} · ${place.name.toUpperCase()}`, `You entered ${place.name.toLowerCase()}.`); }
    save(); render();
  }
  function triggerChoice(choice) {
    if (choice.clue && !state.clues.includes(choice.clue)) { state.clues.push(choice.clue); if (choice.clueMessage) showToast(choice.clueMessage); }
    if (choice.flag && !state.flags.includes(choice.flag)) state.flags.push(choice.flag);
    if (choice.question && !state.questioned.includes(choice.question)) state.questioned.push(choice.question);
    if (choice.journal) addJournal('CASE NOTE', choice.journal);
    if (choice.action === 'evidence') { save(); render(); openDrawer('evidence'); return; }
    if (choice.action === 'accuse') { save(); render(); openAccusation(); return; }
    save(); if (choice.next) visitScene(choice.next); else render(); playTone(360, .04);
  }

  function render() {
    const scene = scenes[state.scene] || scenes.intro;
    const location = locations.find((item) => item.id === scene.location) || locations[0];
    ui.sceneLocation.textContent = location.name.toUpperCase(); ui.sceneTime.textContent = `${location.time}  •  RAINING`;
    ui.sceneArt.dataset.location = location.id; ui.sceneCaption.textContent = location.caption; ui.sceneArt.querySelector('.scene-art-credit').innerHTML = `${location.name.toUpperCase()} <span>—</span> ${location.number}`;
    ui.sceneKicker.textContent = scene.kicker || 'THE INVESTIGATION'; ui.sceneTitle.textContent = scene.title; ui.sceneText.innerHTML = scene.text;
    ui.choices.replaceChildren();
    scene.choices.filter((choice) => hasFlag(choice.requires)).forEach((choice, index) => {
      const button = document.createElement('button'); button.className = 'choice-button';
      button.innerHTML = `<span class="choice-num">0${index + 1}</span><span></span><span class="choice-arrow">↗</span>`;
      button.querySelector('span:nth-child(2)').textContent = choice.label;
      button.addEventListener('click', () => triggerChoice(choice)); ui.choices.append(button);
    });
    renderLocations(); renderSidebars(); renderProgress();
  }
  function renderLocations() {
    ui.locationNav.replaceChildren();
    locations.forEach((location, index) => {
      const unlocked = hasFlag(location.unlock); const visited = state.seenScenes.includes(`visit_${location.id}`);
      const button = document.createElement('button'); button.className = `location-link${state.location === location.id ? ' active' : ''}${visited ? ' visited' : ''}`;
      button.innerHTML = `<span class="location-index">0${index + 1}</span><span></span>${unlocked ? (visited ? '<span class="location-lock">✓</span>' : '') : '<span class="location-lock">⌑</span>'}`;
      button.querySelector('span:nth-child(2)').textContent = unlocked ? location.short : 'Unknown location';
      button.disabled = !unlocked;
      button.addEventListener('click', () => { const sceneForLocation = { gallery: 'frame', security: 'security_intro', office: 'office_intro', corridor: 'corridor_intro', conservatory: 'conservatory_intro', vault: 'vault_intro' }; if (state.location !== location.id) visitScene(sceneForLocation[location.id]); });
      ui.locationNav.append(button);
    });
  }
  function renderSidebars() {
    ui.suspectTotal.textContent = String(suspects.length).padStart(2, '0'); ui.suspectList.replaceChildren();
    suspects.forEach((suspect) => {
      const row = document.createElement('div'); row.className = 'suspect-row';
      row.innerHTML = `<span class="suspect-avatar ${suspect.style}">${suspect.initials}</span><span class="suspect-copy"><span class="suspect-name"></span><span class="suspect-role">${suspect.role.toUpperCase()}</span></span>${state.questioned.includes(suspect.id) ? '<span class="suspect-tag questioned">QUESTIONED</span>' : '<span class="suspect-tag">UNCONFIRMED</span>'}`;
      row.querySelector('.suspect-name').textContent = suspect.name; ui.suspectList.append(row);
    });
    ui.evidenceCount.textContent = String(state.clues.length); ui.journalCount.textContent = String(state.journal.length);
    ui.recentEvidence.replaceChildren();
    const recent = state.clues.slice(-2).reverse();
    if (!recent.length) { const empty = document.createElement('div'); empty.className = 'recent-desc'; empty.textContent = 'No evidence logged yet.'; ui.recentEvidence.append(empty); }
    recent.forEach((id) => { const item = evidence[id]; const row = document.createElement('div'); row.className = 'recent-item'; row.innerHTML = `<span class="evidence-symbol">${item.symbol}</span><span><span class="evidence-title"></span><span class="recent-desc">${item.source}</span></span>`; row.querySelector('.evidence-title').textContent = item.title; ui.recentEvidence.append(row); });
  }
  function renderProgress() { const visitedCount = locations.filter((item) => state.seenScenes.includes(`visit_${item.id}`)).length; const percent = Math.min(100, Math.round((visitedCount / locations.length) * 48 + (state.clues.length / Object.keys(evidence).length) * 35 + state.questioned.length * 4)); ui.progressLabel.textContent = `${String(percent).padStart(2, '0')}%`; ui.progressBar.style.width = `${percent}%`; }

  function openDrawer(name) {
    closeDrawers(); ui.drawerBackdrop.hidden = false;
    if (name === 'evidence') { renderEvidence(); ui.evidenceDrawer.classList.add('open'); ui.evidenceDrawer.setAttribute('aria-hidden', 'false'); }
    if (name === 'journal') { renderJournal(); ui.journalDrawer.classList.add('open'); ui.journalDrawer.setAttribute('aria-hidden', 'false'); }
  }
  function closeDrawers() { ui.evidenceDrawer.classList.remove('open'); ui.journalDrawer.classList.remove('open'); ui.evidenceDrawer.setAttribute('aria-hidden', 'true'); ui.journalDrawer.setAttribute('aria-hidden', 'true'); ui.drawerBackdrop.hidden = true; }
  function renderEvidence() {
    ui.evidenceGrid.replaceChildren(); ui.emptyEvidence.classList.toggle('show', state.clues.length === 0);
    state.clues.forEach((id) => { const item = evidence[id]; const card = document.createElement('button'); card.className = 'evidence-card'; card.innerHTML = `<span class="evidence-symbol">${item.symbol}</span><strong></strong><small></small>`; card.querySelector('strong').textContent = item.title; card.querySelector('small').textContent = `${item.source} · Select to inspect`; card.addEventListener('click', () => showEvidenceDetail(id)); ui.evidenceGrid.append(card); });
    ui.boardCount.textContent = `${state.clues.length} ITEM${state.clues.length === 1 ? '' : 'S'} COLLECTED`;
  }
  function showEvidenceDetail(id) { const item = evidence[id]; showDialog(`<p class="eyebrow">EVIDENCE REVIEW · ${item.source.toUpperCase()}</p><h2>${item.title}</h2><p>${item.description}</p><button class="btn btn-primary" data-dialog-close>Back to evidence <span>→</span></button>`); }
  function renderJournal() {
    ui.journalContent.replaceChildren();
    if (!state.journal.length) { ui.journalContent.innerHTML = '<div class="empty-state show">Your case notes will appear here as you investigate.</div>'; return; }
    [...state.journal].reverse().forEach((entry) => { const item = document.createElement('article'); item.className = 'journal-entry'; item.innerHTML = '<div class="journal-time"></div><h3></h3><p></p>'; item.querySelector('.journal-time').textContent = entry.title; item.querySelector('h3').textContent = entry.title === 'CASE NOTE' ? 'Field observation' : 'Investigation log'; item.querySelector('p').textContent = entry.text; ui.journalContent.append(item); });
  }
  function openAccusation() {
    const evidenceOptions = state.clues.map((id) => `<label class="evidence-check"><input type="checkbox" value="${id}"><span>${evidence[id].title}</span></label>`).join('');
    showDialog(`<p class="eyebrow">FINAL DECISION</p><h2>Who took the Blue Hour?</h2><p>Choose your suspect and the evidence that supports your theory. You need at least one clue to make the accusation.</p><div class="suspect-options">${suspects.map((s) => `<button class="suspect-option" data-suspect="${s.id}">${s.name} <span>— ${s.role}</span></button>`).join('')}</div><div class="select-evidence">${evidenceOptions || '<p class="recent-desc">You have not collected any evidence yet.</p>'}</div><button id="submit-accusation" class="btn btn-primary">Present your case <span>↗</span></button>`);
    let selected = '';
    ui.dialog.querySelectorAll('[data-suspect]').forEach((button) => button.addEventListener('click', () => { selected = button.dataset.suspect; ui.dialog.querySelectorAll('[data-suspect]').forEach((option) => option.classList.toggle('selected', option === button)); }));
    $('#submit-accusation').addEventListener('click', () => {
      if (!selected) { showToast('Choose a suspect before presenting your case.'); return; }
      const selectedClues = [...ui.dialog.querySelectorAll('.evidence-check input:checked')].map((input) => input.value);
      if (!selectedClues.length) { showToast('Select at least one piece of evidence.'); return; }
      const correct = selected === 'elliot' && selectedClues.includes('cutWire') && selectedClues.includes('keyTag');
      const strongCase = correct && selectedClues.includes('falseBack');
      state.ending = correct ? (strongCase ? 'perfect' : 'solved') : 'wrong';
      state.flags.push('case_closed'); save(); showEnding(correct, strongCase, selected);
    });
  }
  function showEnding(correct, strong, suspectId) {
    const suspect = suspects.find((item) => item.id === suspectId);
    let heading, body, stamp;
    if (correct && strong) { heading = 'A case, beautifully made.'; stamp = 'CASE CLOSED · EXEMPLARY'; body = 'The cut wire, the missing key, and the hollow backing form a chain no one can explain away. Elliot’s alibi collapses. In the vault, behind the resealed frame, the Blue Hour is found—untouched. The museum gets its painting back, and the night guard leaves in handcuffs.'; }
    else if (correct) { heading = 'The right suspect.'; stamp = 'CASE CLOSED · SOLVED'; body = 'Elliot’s story cannot survive the evidence you presented. He had access to the cameras and the service key. The Blue Hour is recovered from a false frame in the restoration vault. A few details remain unanswered, but the case is yours.'; }
    else { heading = 'The case remains open.'; stamp = 'CASE STATUS · UNRESOLVED'; body = `${suspect.name} is taken in for questioning, but the evidence does not hold. Later, the Blue Hour is found missing from the vault too. The real thief used the storm—and an unlocked blind spot—to disappear into the night. Revisit the clues and make a stronger case.`; }
    showDialog(`<p class="eyebrow">${stamp}</p><h2>${heading}</h2><p>${body}</p><div class="ending-stats"><span>${state.clues.length} CLUES COLLECTED</span><span>${state.questioned.length} SUSPECTS QUESTIONED</span></div><button id="ending-replay" class="btn btn-primary">${correct ? 'Play again' : 'Reopen the case'} <span>↻</span></button> <button class="text-button" data-dialog-close>Review the scene</button>`);
    $('#ending-replay').addEventListener('click', () => { closeDialog(); state = freshState(); startGame(false); });
  }
  function showDialog(html) { ui.dialog.innerHTML = `<button class="modal-close" data-dialog-close aria-label="Close">×</button>${html}`; ui.dialogBackdrop.hidden = false; ui.dialog.querySelectorAll('[data-dialog-close]').forEach((button) => button.addEventListener('click', closeDialog)); }
  function closeDialog() { ui.dialogBackdrop.hidden = true; }
  function showToast(message) { ui.toast.textContent = message; ui.toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2400); }
  function playTone(frequency = 440, duration = .06) { if (state.muted) return; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.frequency.value = frequency; oscillator.type = 'sine'; gain.gain.setValueAtTime(.035, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration); } catch (_) { /* Audio is optional. */ } }

  ui.newGame.addEventListener('click', () => startGame(false)); ui.continue.addEventListener('click', () => startGame(true));
  ui.how.addEventListener('click', () => { ui.howModal.hidden = false; }); ui.howModal.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => { ui.howModal.hidden = true; }));
  $('#go-menu').addEventListener('click', () => { save(); closeDrawers(); closeDialog(); showScreen('title'); });
  $('#restart-game').addEventListener('click', () => showDialog('<p class="eyebrow">START OVER</p><h2>Reset this case?</h2><p>Your current clues and progress will be replaced with a fresh investigation.</p><button id="confirm-restart" class="btn btn-primary">Restart case <span>↻</span></button> <button class="text-button" data-dialog-close>Keep investigating</button>'));
  ui.dialog.addEventListener('click', (event) => { if (event.target.id === 'confirm-restart') { closeDialog(); startGame(false); } });
  $('#evidence-open').addEventListener('click', () => openDrawer('evidence')); $('#view-all-evidence').addEventListener('click', () => openDrawer('evidence')); $('#journal-open').addEventListener('click', () => openDrawer('journal'));
  $('#accuse-open').addEventListener('click', openAccusation); $('#accuse-from-board').addEventListener('click', openAccusation);
  ui.drawerBackdrop.addEventListener('click', closeDrawers); document.querySelectorAll('[data-close-drawer]').forEach((button) => button.addEventListener('click', closeDrawers));
  ui.dialogBackdrop.addEventListener('click', (event) => { if (event.target === ui.dialogBackdrop) closeDialog(); });
  ui.sound.addEventListener('click', () => { state.muted = !state.muted; ui.sound.classList.toggle('muted', state.muted); ui.sound.setAttribute('aria-label', state.muted ? 'Turn sound on' : 'Turn sound off'); save(); if (!state.muted) playTone(520, .1); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDrawers(); closeDialog(); ui.howModal.hidden = true; } });
  window.addEventListener('beforeunload', save);
  updateContinue(); ui.sound.classList.toggle('muted', state.muted);
})();
