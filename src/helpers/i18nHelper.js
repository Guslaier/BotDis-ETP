const settingsManager = require('./settingsManager');

const dictionary = {
 th: {
 // Voice & Permissions
 VOICE_JOIN_REQUIRED:'ต้องเข้าห้องเสียงก่อนนะ เดี๋ยว GOOLIX เหงาแย่เลย!',
 VOICE_SAME_REQUIRED:'ต้องเข้าห้องเสียงเดียวกับ GOOLIX ก่อนนะ ถึงจะคุมสเตจได้!',
 NO_PLAYING_TRACK:'ไม่มีเพลงที่กำลังเล่นอยู่ตอนนี้เลยนะ!',
 NO_QUEUE:'ตอนนี้ไม่มีเพลงในคิวเลยครับ สั่งเปิดเพลงได้เลย',
 GENERIC_ERROR:'เกิดข้อผิดพลาดในการประมวลผลคำสั่งครับ',
 TRACK_NOT_FOUND:'หาเพลงไม่เจอ! (ลองพิมพ์เฉพาะชื่อเพลงสั้นๆ ดูนะ )',
 PLAYLIST_NOT_FOUND:'หาเพลย์ลิสต์ไม่เจอครับ (กรุณาตรวจสอบว่าลิงก์ไม่ได้ตั้งเป็น Private หรือพิมพ์ชื่อให้ชัดเจนขึ้นครับ)',
 PLAY_ERROR:'เกิดข้อผิดพลาดในการเริ่มเล่นเพลงครับ',
 NOW_PLAYING_NOT_PLAYING:'ตอนนี้ไม่ได้เปิดเพลงอยู่ครับ',
 NO_TRACK_INFO:'ไม่พบข้อมูลเพลงครับ',

 // Playback Status & Notifications
 QUEUE_EMPTY:'คิวเพลงว่างเปล่าแล้ว! GOOLIX สไลม์เขียวขอแวบไปชาร์จบีตก่อนนะ',
 NOW_PLAYING:'▶ สเตจพร้อม! GOOLIX เริ่มเปิดเพลงแล้ว',
 ADDED_QUEUE:'รับทราบ! GOOLIX จับลงคิวให้แล้ว เตรียมตัวโยกได้เลย',
 SUPPORTER_PRIORITY_ADDED:'⬆ Priority Fast-Track! แซงคิวขึ้นเป็นเพลงถัดไปให้ทันใจ',
 PLAYLIST_ADDED:'โหลดเพลย์ลิสต์สำเร็จ! เพิ่มเพลงเข้าคิวให้เรียบร้อยแล้ว',
 RESUMED:'▶ ลุยกันต่อเลย! GOOLIX คัมแบ็ก ปล่อยบีตโยกต่อยาวๆ',
 ALREADY_PLAYING:'เพลงกำลังเล่นอยู่แล้วนะ เต้นต่อเลยไม่ต้องรอ!',
 PAUSED:'พักเบรกจังหวะชั่วคราว กดเล่นต่อเมื่อพร้อมนะ',
 ALREADY_PAUSED:'เพลงถูกพักไว้อยู่แล้วครับ กดเล่นต่อได้เลย',
 STOPPED:'ปิดสเตจเรียบร้อยครับ ล้างคิวและหยุดเพลงทั้งหมดแล้ว ไว้เจอกันใหม่นะครับ',
 SKIPPED:'ข้ามเพลงเรียบร้อยแล้ว กำลังเตรียมเล่น: **{title}**',
 SKIPPLAY_PLAYLIST:'สับเพลงใหม่ทันใจ! ข้ามไปเล่นเพลย์ลิสต์ **{title}** ให้แล้ว',
 SKIPPLAY_TRACK:'ข้ามเพลงเดิมแล้วเปิดเพลง **{title}** ให้ทันใจ!',
 PREVIOUS_PLAYING:'กำลังย้อนกลับไปเล่นเพลง: **{title}** ครับ',
 NO_PREVIOUS:'ไม่มีเพลงก่อนหน้านี้ในประวัติครับ',
 QUEUE_CLEARED:'ล้างคิวเพลงที่รออยู่ทั้งหมดเรียบร้อยแล้วครับ',
 QUEUE_SHUFFLED:'สุ่มลำดับคิวเพลงใหม่เรียบร้อยแล้วครับ',
 NEED_MORE_TRACKS_SHUFFLE:'ต้องมีเพลงในคิวมากกว่า 1 เพลงขึ้นไปจึงจะสามารถสุ่มคิวได้ครับ',

 // Seek & Controls
 SEEK_SUCCESS:'วาร์ปไปที่เวลา **{time}** ให้เรียบร้อย!',
 SEEK_FORWARD_SUCCESS:'เร่งสปีด! กรอเดินหน้าไป **{seconds} วินาที** (ตอนนี้อยู่ที่`{pos}`)',
 SEEK_BACKWARD_SUCCESS:'ถอยหลังนิดนึง! กรอย้อนกลับไป **{seconds} วินาที** (ตอนนี้อยู่ที่`{pos}`)',
 SEEK_TOO_FAR:'เวลาเกินความยาวเพลงแล้วนะ! กรอซะทะลุเพลงเลย',
 CANNOT_SEEK_LIVE:'ไม่สามารถกรอเพลงที่เป็น Live Stream สดได้นะ',
 SEEK_INVALID_TIME:'รูปแบบเวลาไม่ถูกต้อง! ลองพิมพ์แบบ 01:30 หรือใส่เป็นตัวเลขวินาทีดูนะ',
 SEEK_EXCEED_DURATION:'กรอเกินความยาวเพลงไม่ได้ครับ เพลงนี้ยาวแค่`{duration}`',
 STALE_CARD_REMOVED:'ตรวจพบการ์ดเพลงเก่าที่ค้างอยู่ GOOLIX เคลียร์ทิ้งให้แล้วนะ (ใช้การ์ดล่าสุดด้านล่างได้เลย )',
 CLEANCARD_NO_ACCESS:'ไม่สามารถเข้าถึงข้อความในห้องนี้ได้ครับ',
 CLEANCARD_NONE:'ไม่พบการ์ดเพลงที่ค้างอยู่เลยครับ ห้องแชทสะอาดเรียบร้อยดีแล้ว',
 CLEANCARD_SUCCESS:'กวาดล้างเรียบร้อย! ลบการ์ดเพลงเก่าที่ค้างอยู่จำนวน **{count}** ใบแล้วครับ',

 // Loop & Volume
 LOOP_NONE:'ปิดการวนลูปแล้วครับ',
 LOOP_TRACK:'วนซ้ำเพลงปัจจุบัน (Repeat Track)',
 LOOP_QUEUE:'วนซ้ำทั้งคิว (Repeat Queue)',
 VOLUME_CURRENT:'ระดับเสียงปัจจุบันของเซิร์ฟเวอร์นี้คือ **{volume}%** ครับ\n*(พิมพ์`/gvolume <0-150>`เพื่อเปลี่ยนและบันทึกค่า)*',
 VOLUME_SET:'ปรับและบันทึกระดับเสียงเป็น **{volume}%** เรียบร้อยครับ',
 VOLUME_MUTED:'ปิดเสียงเป็น **0%** (Muted) เรียบร้อยครับ',

 // Queue Operations (Jump, Move, Remove)
 JUMP_SUCCESS:'⬆ Priority Jump! ดันเพลง **{title}** แซงคิวขึ้นมาเป็นเพลงถัดไปเรียบร้อยครับ',
 JUMP_NO_TRACKS:'คิวเพลงว่างเปล่าครับ ไม่มีเพลงให้แซงคิว',
 JUMP_FAIL:'ไม่สามารถดึงเพลงออกจากคิวได้ครับ',
 INVALID_QUEUE_POS:'ระบุลำดับคิวไม่ถูกต้องครับ ต้องอยู่ระหว่าง 1 ถึง {max}',
 MOVE_SUCCESS:'ย้ายเพลง **[{title}]({uri})** จากลำดับที่ **{from}** ไปยังลำดับที่ **{to}** เรียบร้อยครับ',
 MOVE_SAME_POS:'ตำแหน่งเดิมกับตำแหน่งใหม่เป็นตำแหน่งเดียวกันครับ',
 MOVE_EMPTY:'ไม่มีเพลงในคิวให้ย้ายครับ ตอนนี้คิวว่างเปล่า',
 MOVE_INVALID_POS:'ลำดับไม่ถูกต้องครับ ตอนนี้ในคิวมีเพลงรออยู่ **{count}** เพลง',
 REMOVE_SUCCESS:'ลบเพลง **{title}** ออกจากคิวเรียบร้อยแล้วครับ',
 REMOVE_FAIL:'ไม่สามารถลบเพลงออกจากคิวได้ครับ',

 // Queue View Interactive Embed
 QUEUE_TITLE_CURRENT:'คิวเพลงของค่ำคืนนี้',
 QUEUE_ALL_TITLE:'คิวเพลงทั้งหมดของค่ำคืนนี้ ({count} เพลง)',
 QUEUE_NOW_PLAYING_LABEL:'กำลังเล่น:',
 QUEUE_REQUESTED_BY_LABEL:'ขอโดย:',
 QUEUE_EMPTY_NEXT:'ไม่มีเพลงในคิวแล้วครับ สั่งเพลงเพิ่มได้เลย!',
 QUEUE_PAGE_HEADER:'รอคิว (หน้า {page}/{total}):',
 QUEUE_BTN_PREV:'⬅ หน้าก่อน',
 QUEUE_BTN_NEXT:'หน้าถัดไป',
 QUEUE_FOOTER:'ปาร์ตี้นี้ยาวไปปป!',
 QUEUE_ONLY_INVOKER:'ปุ่มนี้สำหรับผู้ที่เรียกดูคิวเท่านั้นครับ',

 // Lyrics
 LYRICS_NOT_FOUND:'ขออภัยครับ หาเนื้อเพลงสำหรับ **{title}** ไม่เจอ',
 LYRICS_TITLE:'เนื้อเพลง: {title}',
 LYRICS_SOURCE:'แหล่งที่มา: {source}',
 LYRICS_ERROR:'เกิดข้อผิดพลาดในการค้นหาเนื้อเพลงครับ',

 // Favorites
 FAV_NO_PLAYING:'ไม่มีเพลงที่กำลังเล่นอยู่ตอนนี้ครับ เปิดเพลงก่อนแล้วค่อยกดบันทึกนะ',
 FAV_ADDED:'บันทึกเพลง **{title}** ลงในรายการเพลงโปรดของคุณเรียบร้อยแล้วครับ!',
 FAV_ALREADY_EXISTS:'ℹ เพลง **{title}** มีอยู่ในรายการโปรดของคุณอยู่แล้วครับ',
 FAV_EMPTY:'คุณยังไม่มีเพลงโปรดครับ ลองฟังเพลงแล้วกดปุ่ม หรือใช้`/gfav add`ดูนะ',
 FAV_LIST_TITLE:'รายการเพลงโปรดของคุณ ({count} เพลง)',
 FAV_MORE:'...และอีก {count} เพลง',
 FAV_PLAY_TIP:'*พิมพ์`/gfav play`เพื่อเล่นเพลงโปรดทั้งหมดเข้าคิวได้เลยครับ!*',
 FAV_REMOVED:'ลบเพลง **{title}** ออกจากรายการเพลงโปรดเรียบร้อยแล้วครับ!',
 FAV_PLAY_ADDED:'เพิ่มเพลงโปรด **{count}** เพลงลงในคิวเรียบร้อยแล้วครับ! ปาร์ตี้เริ่มได้เลย!',

 // Supporter & Quotas
 SLOTS_FULL_TITLE:'ช่องสัญญาณเซิร์ฟเวอร์เต็ม',
 SLOTS_FULL:'ขณะนี้ช่องสัญญาณทั่วไปเต็มแล้ว ({current}/{max} ห้อง) — ร่วมสนับสนุนเซิร์ฟเวอร์เพื่อเข้าใช้ช่องทางด่วนได้ทันที!',
 CLUSTER_FULL:'ขณะนี้ช่องสัญญาณเซิร์ฟเวอร์เต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้งครับ',
 QUEUE_LIMIT_TITLE:'คิวเพลงเต็มโควตา',
 QUEUE_LIMIT_FREE:'คิวเพลงเซิร์ฟเวอร์ทั่วไปจำกัดสูงสุด 10 เพลง — ร่วมสนับสนุนเซิร์ฟเวอร์เพื่อขยายคิวเป็น 50 เพลง!',
 SONG_TOO_LONG_TITLE:'เพลงนี้ยาวเกิน 30 นาที',
 SONG_TOO_LONG:'เพลงนี้ยาวเกิน 30 นาที ({duration}) — สิทธิพิเศษสำหรับผู้สนับสนุนฟังได้ยาวไม่จำกัด!',
 PLAYLIST_LIMIT_FREE:'เซิร์ฟเวอร์ทั่วไป (Free) สามารถดึงเพลย์ลิสต์ได้ครั้งละสูงสุด 5 เพลงครับ (อัปเกรด Supporter ดึงได้สูงสุด 25 เพลง)',
 PLAYLIST_LIMIT_WARNING:'*(จำกัดดึงสูงสุด {limit} เพลงตามโควต้าเซิร์ฟเวอร์ครับ)*',
 PLAYLIST_SKIPPED_30MIN:'*(ข้าม {count} เพลงที่ยาวเกิน 30 นาที สำหรับเซิร์ฟเวอร์ทั่วไป)*',
 DONATE_BTN_LABEL:'สนับสนุนเซิร์ฟเวอร์ (Supporter Lanes)',
 AUTOPLAY_SUPPORTER_ONLY:'ฟีเจอร์ **เล่นเพลงต่อเนื่องอัตโนมัติ (Autoplay)** สงวนไว้สำหรับเซิร์ฟเวอร์ผู้สนับสนุน (Supporter) นะ!\n\nพิมพ์`/gdonate`เพื่อดูรายละเอียดการร่วมสนับสนุน',
 FILTER_SUPPORTER_ONLY:'ระบบปรับแต่งโทนเสียง Equalizer สงวนไว้สำหรับเซิร์ฟเวอร์ **Supporter** นะ!\n\nพิมพ์`/gdonate`เพื่อดูรายละเอียดการร่วมสนับสนุน',
 FILTER_CHANGED:'ปรับแต่งโทนเสียง Equalizer เป็น: **{filter}**\n*(มีผลทันทีกับเพลงที่กำลังเล่นและเพลงถัดไป)*',

 // Feature Maintenance & Access
 FEATURE_MAINTENANCE_TITLE:'ฟังก์ชันปิดปรับปรุงชั่วคราว',
 FEATURE_SUPPORTER_TITLE:'ฟังก์ชันสำหรับผู้สนับสนุน (Supporter Only)',
 FEATURE_MAINTENANCE_DESC:'ฟังก์ชัน **{name}** ({command}) ปิดปรับปรุงชั่วคราวเพื่อรักษาเสถียรภาพระบบครับ',
 FEATURE_SUPPORTER_DESC:'ฟังก์ชัน **{name}** ({command}) เปิดให้ใช้งานเฉพาะเซิร์ฟเวอร์ผู้สนับสนุน (Supporter VIP) เท่านั้นครับ\n\nพิมพ์`/gdonate`เพื่อดูรายละเอียดการร่วมสนับสนุน',

 // Card Buttons & Labels
 BTN_SHUFFLE:'สลับเพลง',
 BTN_LOOP:'วนซ้ำ',
 BTN_QUEUE:'คิวเพลง',
 BTN_LYRICS:'เนื้อเพลง',
 BTN_FAVORITES:'เพลงโปรด',
 BTN_REQUEST_SONG:'ขอเพลง',
 BTN_PLAYLIST:'เพลย์ลิสต์',
 BTN_VOLUME:'ระดับเสียง',
 BTN_AUTOPLAY_ON:'ออโต้เพลย์: เปิด',
 BTN_AUTOPLAY_OFF:'ออโต้เพลย์: ปิด',
 BTN_STOP:'หยุดเล่น',

 // Card Badges & Indicators
 CARD_STAGE_TITLE:'Cosmic Stage',
 CARD_SWITCHING_STAGE:'กำลังเปลี่ยนเพลง',
 CARD_PREPARING_STREAM:'กำลังเตรียมสตรีมเสียง...',
 CARD_BUFFERING:'กำลังโหลด...',
 CARD_LISTENING:'{count} คนกำลังฟัง',
 CARD_LOOP_OFF:'ปิดลูป',
 CARD_LOOP_TRACK:'วนเพลงนี้',
 CARD_LOOP_QUEUE:'วนทั้งคิว',
 CARD_STANDARD_TIER:'64k ทั่วไป',
 CARD_SUPPORTER_TIER:'96k ผู้สนับสนุน',

 // Quick Controls & Modals
 SPECIFY_QUERY:'กรุณาระบุชื่อเพลงหรือลิงก์ครับ',
 MODAL_SONG_TITLE:'ขอเพลง / ค้นหาเพลง',
 MODAL_SONG_LABEL:'ชื่อเพลง หรือ ลิงก์เพลง',
 MODAL_SONG_PLACEHOLDER:'เช่น ทรงอย่างแบด หรือ https://youtube.com/watch?v=...',
 MODAL_PLAYLIST_TITLE:'เพิ่มเพลย์ลิสต์เพลง',
 MODAL_PLAYLIST_LABEL:'ลิงก์เพลย์ลิสต์เพลง',
 MODAL_PLAYLIST_PLACEHOLDER:'https://www.youtube.com/playlist?list=...',
 VOLUME_SELECT_TITLE:'เลือกระดับเสียงด่วนที่ต้องการปรับ (ปัจจุบัน: **{volume}%**):',
 STATUS_REPLAY_PREV:'กำลังย้อนกลับไปเพลงก่อนหน้า...',
 STATUS_SKIPPING:'กำลังข้ามเพลง...',
 STATUS_PREPARING_NEXT:'กำลังเตรียมเพลงถัดไป...',
 GUILD_ONLY:'คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้นครับ',
 BOT_NOT_IN_GUILD:'บอทไม่อยู่ในเซิร์ฟเวอร์นี้แล้วครับ กรุณาเชิญบอทเข้าเซิร์ฟเวอร์ใหม่อีกครั้ง',

 // Language
 LANG_TITLE:'ตั้งค่าภาษาของเซิร์ฟเวอร์',
 LANG_CHANGED:'เปลี่ยนภาษาของบอทในเซิร์ฟเวอร์เป็น: **ภาษาไทย (TH)** เรียบร้อยแล้ว!'
 },
 en: {
 // Voice & Permissions
 VOICE_JOIN_REQUIRED:'You must join a voice channel first so GOOLIX can groove with you!',
 VOICE_SAME_REQUIRED:'You must be in the same voice channel as GOOLIX to control the stage!',
 NO_PLAYING_TRACK:'No music is currently playing on this stage!',
 NO_QUEUE:'Queue is currently empty! Feel free to play something',
 GENERIC_ERROR:'An error occurred while executing this command.',
 TRACK_NOT_FOUND:'Track not found! (Try searching with a shorter title )',
 PLAYLIST_NOT_FOUND:'Playlist not found! (Please check that playlist is not private or search with exact name)',
 PLAY_ERROR:'An error occurred while starting audio playback.',
 NOW_PLAYING_NOT_PLAYING:'No music is currently playing on this stage',
 NO_TRACK_INFO:'Track information could not be retrieved.',

 // Playback Status & Notifications
 QUEUE_EMPTY:'Queue is empty! GOOLIX Slime DJ is bouncing out to recharge the beats!',
 NOW_PLAYING:'▶ Stage is live! GOOLIX is dropping the track',
 ADDED_QUEUE:'Added to queue! GOOLIX is lining up the groove',
 SUPPORTER_PRIORITY_ADDED:'⬆ Priority Fast-Track! Jumped straight to next up in queue',
 PLAYLIST_ADDED:'Playlist loaded! Tracks added to queue smoothly',
 RESUMED:'▶ Resumed! GOOLIX is back with the high-voltage groove',
 ALREADY_PLAYING:'Music is already playing! Keep on grooving!',
 PAUSED:'Playback paused. Hit resume whenever you are ready',
 ALREADY_PAUSED:'Playback is already paused! Hit resume when ready',
 STOPPED:'Stage closed! Playback stopped and queue cleared. Catch you next time!',
 SKIPPED:'Track skipped! Now preparing: **{title}**',
 SKIPPLAY_PLAYLIST:'Skipped current track and jumped straight into playlist **{title}**!',
 SKIPPLAY_TRACK:'Skipped current track and immediately playing **{title}**!',
 PREVIOUS_PLAYING:'Replaying previous track: **{title}**',
 NO_PREVIOUS:'No previous track found in playback history!',
 QUEUE_CLEARED:'All upcoming queued tracks have been cleared!',
 QUEUE_SHUFFLED:'Queue tracks have been shuffled randomly!',
 NEED_MORE_TRACKS_SHUFFLE:'Need more than 1 track in queue to shuffle!',

 // Seek & Controls
 SEEK_SUCCESS:'Fast-forwarded to timestamp **{time}** smoothly!',
 SEEK_FORWARD_SUCCESS:'Accelerated! Fast-forwarded by **{seconds}s** (Now at`{pos}`)',
 SEEK_BACKWARD_SUCCESS:'Rewound! Stepped backward by **{seconds}s** (Now at`{pos}`)',
 SEEK_TOO_FAR:'Time exceeds total track duration!',
 CANNOT_SEEK_LIVE:'Cannot seek within a live stream broadcast',
 SEEK_INVALID_TIME:'Invalid time format! Try typing like`01:30`or total seconds',
 SEEK_EXCEED_DURATION:'Cannot seek past track length! Track duration is`{duration}`',
 STALE_CARD_REMOVED:'Old music card cleaned up by GOOLIX! (Please use the latest card below )',
 CLEANCARD_NO_ACCESS:'Cannot access messages in this channel.',
 CLEANCARD_NONE:'No lingering music cards found. Channel is clean!',
 CLEANCARD_SUCCESS:'All clean! Removed **{count}** lingering music cards',

 // Loop & Volume
 LOOP_NONE:'Loop mode disabled',
 LOOP_TRACK:'Repeating current track (Repeat Track)',
 LOOP_QUEUE:'Repeating entire queue (Repeat Queue)',
 VOLUME_CURRENT:'Current server playback volume is **{volume}%**\n*(Type`/gvolume <0-150>`to adjust and save)*',
 VOLUME_SET:'Playback volume adjusted and saved to **{volume}%**',
 VOLUME_MUTED:'Playback muted to **0%**',

 // Queue Operations (Jump, Move, Remove)
 JUMP_SUCCESS:'⬆ Priority Jump! Promoted **{title}** to play next up in queue',
 JUMP_NO_TRACKS:'Queue is empty! No tracks available to jump',
 JUMP_FAIL:'Failed to move track in queue',
 INVALID_QUEUE_POS:'Invalid queue position! Must be between 1 and {max}',
 MOVE_SUCCESS:'Moved **[{title}]({uri})** from position **{from}** to **{to}**',
 MOVE_SAME_POS:'Source and destination positions are the same!',
 MOVE_EMPTY:'Queue is empty! No tracks to move',
 MOVE_INVALID_POS:'Invalid position! Current queue has **{count}** tracks',
 REMOVE_SUCCESS:'Removed track **{title}** from queue',
 REMOVE_FAIL:'Failed to remove track from queue',

 // Queue View Interactive Embed
 QUEUE_TITLE_CURRENT:'Current Stage Queue',
 QUEUE_ALL_TITLE:'Full Stage Queue ({count} tracks)',
 QUEUE_NOW_PLAYING_LABEL:'Now Playing:',
 QUEUE_REQUESTED_BY_LABEL:'Requested by:',
 QUEUE_EMPTY_NEXT:'Queue is currently empty. Add more tracks to queue!',
 QUEUE_PAGE_HEADER:'Up Next (Page {page}/{total}):',
 QUEUE_BTN_PREV:'⬅ Previous',
 QUEUE_BTN_NEXT:'Next',
 QUEUE_FOOTER:'Keep the cosmic groove alive!',
 QUEUE_ONLY_INVOKER:'This control is only accessible by the command invoker',

 // Lyrics
 LYRICS_NOT_FOUND:'Sorry, no lyrics found for **{title}**',
 LYRICS_TITLE:'Lyrics: {title}',
 LYRICS_SOURCE:'Source: {source}',
 LYRICS_ERROR:'An error occurred while retrieving song lyrics',

 // Favorites
 FAV_NO_PLAYING:'No music is currently playing on this stage to save to favorites',
 FAV_ADDED:'Saved **{title}** to your favorites list!',
 FAV_ALREADY_EXISTS:'ℹ **{title}** is already in your favorites',
 FAV_EMPTY:'You have no favorites saved yet. Press or use`/gfav add`to save!',
 FAV_LIST_TITLE:'Your Favorite Tracks ({count} songs)',
 FAV_MORE:'...and {count} more tracks',
 FAV_PLAY_TIP:'*Type`/gfav play`to queue all your favorite tracks!*',
 FAV_REMOVED:'Removed **{title}** from your favorites list!',
 FAV_PLAY_ADDED:'Added **{count}** favorite tracks to the queue! Let the party begin!',

 // Supporter & Quotas
 SLOTS_FULL_TITLE:'Server Stream Slots Full',
 SLOTS_FULL:'Free stream slots are full ({current}/{max} rooms) — Support GOOLIX to access priority lanes instantly!',
 CLUSTER_FULL:'Cluster streaming capacity temporarily reached. Please retry in a moment.',
 QUEUE_LIMIT_TITLE:'Queue Limit Reached',
 QUEUE_LIMIT_FREE:'Free queue limit reached (10 songs max) — Become a Supporter to expand queue up to 50 songs!',
 SONG_TOO_LONG_TITLE:'Track Exceeds 30 Minutes',
 SONG_TOO_LONG:'Track exceeds 30 minutes ({duration}) — Supporters enjoy unlimited song length!',
 PLAYLIST_LIMIT_FREE:'Free servers can add up to 5 songs per playlist (Upgrade to Supporter for up to 25 songs)',
 PLAYLIST_LIMIT_WARNING:'*(Limited to {limit} tracks per quota limit)*',
 PLAYLIST_SKIPPED_30MIN:'*(Skipped {count} tracks > 30 mins for Free Tier)*',
 DONATE_BTN_LABEL:'Support Server (Supporter Lanes)',
 AUTOPLAY_SUPPORTER_ONLY:'**Autoplay Mode** is reserved for Server Supporters!\n\nType`/gdonate`to view supporter options',
 FILTER_SUPPORTER_ONLY:'Equalizer Audio Filters are reserved for **Server Supporters**!\n\nType`/gdonate`to view supporter options',
 FILTER_CHANGED:'Equalizer tone set to: **{filter}**\n*(Applied immediately to current and upcoming tracks)*',

 // Feature Maintenance & Access
 FEATURE_MAINTENANCE_TITLE:'Feature Under Maintenance',
 FEATURE_SUPPORTER_TITLE:'Supporter Exclusive Feature',
 FEATURE_MAINTENANCE_DESC:'Feature **{name}** ({command}) is temporarily under maintenance for system stability.',
 FEATURE_SUPPORTER_DESC:'Feature **{name}** ({command}) is reserved for Server Supporters (VIP)!\n\nType`/gdonate`to view supporter perks.',

 // Card Buttons & Labels
 BTN_SHUFFLE:'Shuffle',
 BTN_LOOP:'Loop',
 BTN_QUEUE:'Queue',
 BTN_LYRICS:'Lyrics',
 BTN_FAVORITES:'Favorites',
 BTN_REQUEST_SONG:'Add Song',
 BTN_PLAYLIST:'Playlist',
 BTN_VOLUME:'Volume',
 BTN_AUTOPLAY_ON:'Autoplay On',
 BTN_AUTOPLAY_OFF:'Autoplay Off',
 BTN_STOP:'Stop',

 // Card Badges & Indicators
 CARD_STAGE_TITLE:'Cosmic Stage',
 CARD_SWITCHING_STAGE:'Switching Track',
 CARD_PREPARING_STREAM:'Preparing audio stream...',
 CARD_BUFFERING:'Buffering...',
 CARD_LISTENING:'{count} listening',
 CARD_LOOP_OFF:'Off',
 CARD_LOOP_TRACK:'Track',
 CARD_LOOP_QUEUE:'Queue',
 CARD_STANDARD_TIER:'64k Standard',
 CARD_SUPPORTER_TIER:'96k Supporter',

 // Quick Controls & Modals
 SPECIFY_QUERY:'Please enter a song title or URL.',
 MODAL_SONG_TITLE:'Request / Search Song',
 MODAL_SONG_LABEL:'Song title or URL',
 MODAL_SONG_PLACEHOLDER:'e.g. Sailor Song or https://youtube.com/watch?v=...',
 MODAL_PLAYLIST_TITLE:'Add Playlist',
 MODAL_PLAYLIST_LABEL:'Playlist URL',
 MODAL_PLAYLIST_PLACEHOLDER:'https://www.youtube.com/playlist?list=...',
 VOLUME_SELECT_TITLE:'Select quick playback volume (Current: **{volume}%**):',
 STATUS_REPLAY_PREV:'Replaying previous track...',
 STATUS_SKIPPING:'Skipping track...',
 STATUS_PREPARING_NEXT:'Preparing next track...',
 GUILD_ONLY:'This command can only be used within a server.',
 BOT_NOT_IN_GUILD:'Bot is no longer in this server. Please re-invite the bot.',

 // Language
 LANG_TITLE:'Language Configuration',
 LANG_CHANGED:'Server bot language switched to: **English (EN)** successfully!'
 }
};

class I18nHelper {
 getLang(guildId) {
 return settingsManager.getGuildLanguage(guildId) ||'th';
 }

 isEn(guildId) {
 return this.getLang(guildId) ==='en';
 }

 t(guildId, key, vars = {}) {
 const lang = this.getLang(guildId);
 const localeDict = dictionary[lang] || dictionary.th;
 let text = localeDict[key] || dictionary.en?.[key] || dictionary.th?.[key] || key;

 for (const [k, v] of Object.entries(vars)) {
 text = text.replace(new RegExp(`\\{${k}\\}`,'g'), v);
 }
 return text;
 }
}

module.exports = new I18nHelper();
