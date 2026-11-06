const { EmbedBuilder } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');

module.exports = {
    data: {
        name: 'ghelp',
        description: 'ดูคู่มือและคำสั่งทั้งหมดของบอท GOOLIX (Commands & Guide)',
    },
    run: async (client, interaction) => {
        const guildId = interaction.guild?.id;
        const isEn = settingsManager.getGuildLanguage(guildId) === 'en';

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(isEn ? '🟢 GOOLIX Cosmic Slime DJ • User Manual' : '🟢 คู่มือการใช้งาน GOOLIX สไลม์เขียวพลังเบส')
            .setDescription(isEn 
                ? 'Welcome to **GOOLIX**! Drop high-voltage grooves and pure low-latency audio.\nType `/` followed by command name to run!'
                : 'ยินดีต้อนรับสู่ **GOOLIX**! สไลม์เขียวพลังเบส คลื่นเสียงกรูฟแน่น ไร้สะดุด 🟢⚡\nพิมพ์ `/` แล้วตามด้วยชื่อคำสั่งเพื่อเรียกใช้งานได้เลย!')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                {
                    name: isEn ? '🎵 Playback & Tracks' : '🎵 หมวดเล่นเพลง (Playback)',
                    value: isEn ? [
                        '`/gplay` - Play from Red Bird / Green Bird / Orange Cloud (supports `top` and `playlist`)',
                        '`/gplaylist` - Load entire playlist or mix into queue (5-50 tracks)',
                        '`/gpause` - Pause current track',
                        '`/gresume` - Resume playback',
                        '`/gstop` - Stop music, clear queue, and leave voice channel',
                        '`/gfav` - Manage your personal favorite tracks (add, list, play, remove)'
                    ].join('\n') : [
                        '`/gplay` - เล่นเพลงเดี่ยวจาก นกแดง / นกเขียว / เมฆส้ม (มีตัวเลือก `top` แซงคิว และ `playlist`)',
                        '`/gplaylist` - เล่นเพลย์ลิสต์/มิกซ์ ยกชุดลงในคิว (ดึงได้ 5-50 เพลง)',
                        '`/gpause` - หยุดเพลงชั่วคราว',
                        '`/gresume` - เล่นเพลงต่อ',
                        '`/gstop` - หยุดเล่น ล้างคิว และออกจากห้องเสียง',
                        '`/gfav` - จัดการเพลงโปรดของคุณ (add, list, play, remove)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: isEn ? '📑 Queue Controls' : '📑 หมวดจัดการคิว (Queue Control)',
                    value: isEn ? [
                        '`/gqueue` - View active tracks waiting in queue',
                        '`/gskip` - Skip to next track in queue',
                        '`/gskipplay` - Skip current track and immediately play new query',
                        '`/gprevious` - Replay previous track',
                        '`/gshuffle` - Shuffle queue tracks randomly',
                        '`/gmove` - Move a track position in queue',
                        '`/gloop` - Toggle loop mode (track, queue, off)',
                        '`/gclear` - Clear all pending tracks in queue',
                        '`/gjump` - Jump track forward in queue',
                        '`/gremove` - Remove specific track number from queue'
                    ].join('\n') : [
                        '`/gqueue` - ดูรายการคิวเพลงที่กำลังรอเล่น',
                        '`/gskip` - ข้ามไปยังเพลงถัดไป',
                        '`/gskipplay` - ข้ามเพลงปัจจุบันแล้วเล่นเพลงใหม่ทันที',
                        '`/gprevious` - ย้อนกลับไปเล่นเพลงก่อนหน้า',
                        '`/gshuffle` - สลับลำดับเพลงในคิวแบบสุ่ม',
                        '`/gmove` - สลับย้ายตำแหน่งเพลงในคิว',
                        '`/gloop` - เปิดวนลูป (track: เพลงเดียว, queue: ทั้งคิว, off: ปิด)',
                        '`/gclear` - ล้างเพลงทั้งหมดที่รออยู่ในคิว',
                        '`/gjump` - แซงคิว! ดึงเพลงในคิวขึ้นมาเล่นเป็นเพลงถัดไป',
                        '`/gremove` - ลบเพลงตามลำดับที่เจาะจงออกจากคิว'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: isEn ? '🎛️ Audio Tuning & Supporter Perks' : '🎛️ หมวดปรับแต่งเสียง & ผู้สนับสนุน (Audio & Supporter)',
                    value: isEn ? [
                        '`/gvolume` - Set playback volume (0 - 150%)',
                        '`/gfilter` - Equalizer audio filters (BassBoost, Nightcore, Pop, etc.) [Supporter]',
                        '`/gseek` - Seek to time position (e.g. 1:30 or 90)',
                        '`/gforward` - Fast forward by seconds',
                        '`/gbackward` - Rewind by seconds',
                        '`/gautoplay` - Toggle intelligent continuous autoplay [Supporter]',
                        '`/gdonate` - Server Supporter VIP portal & top-up perks (status, support, redeem)'
                    ].join('\n') : [
                        '`/gvolume` - ปรับระดับความดังของเสียง (0 - 150%)',
                        '`/gfilter` - ปรับแต่งเสียง Equalizer (BassBoost, Nightcore, Pop ฯลฯ) [Supporter]',
                        '`/gseek` - กรอไปยังตำแหน่งเวลาที่ต้องการ (เช่น 1:30 หรือ 90)',
                        '`/gforward` - กรอเดินหน้าตามจำนวนวินาที',
                        '`/gbackward` - กรอย้อนหลังตามจำนวนวินาที',
                        '`/gautoplay` - เปิด/ปิดระบบเล่นเพลงต่อเนื่องอัตโนมัติเมื่อคิวหมด [Supporter]',
                        '`/gdonate` - สนับสนุนค่าเซิร์ฟเวอร์ & รับของขวัญตอบแทน (status, support, redeem)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: isEn ? '🛡️ System & Localization' : '🛡️ หมวดข้อมูล & ตั้งค่าภาษา (System & Settings)',
                    value: isEn ? [
                        '`/glang` - Switch server bot language (Thai 🇹🇭 / English 🇬🇧)',
                        '`/gnowplaying` - View interactive now-playing dashboard card',
                        '`/gcleancard` - Clean up lingering music cards in text channel',
                        '`/glyrics` - Search and display song lyrics',
                        '`/gstats` - Real-time cluster stats, RAM, Uptime, and Audio Engine',
                        '`/gproxy` - Egress network status, VPN failover & testing',
                        '`/gping` - Check Discord API latency and bot ping',
                        '`/ghelp` - Open this manual'
                    ].join('\n') : [
                        '`/glang` - เปลี่ยนภาษาการสื่อสารของบอท (ภาษาไทย 🇹🇭 / English 🇬🇧)',
                        '`/gnowplaying` - ดูการ์ดเพลงและแผงปุ่มควบคุม Now Playing',
                        '`/gcleancard` - กวาดล้างการ์ดเพลงเก่าหรือการ์ดที่ค้างอยู่ในห้องแชท',
                        '`/glyrics` - ค้นหาและดูเนื้อเพลง',
                        '`/gstats` - ดูสถิติระบบ, RAM, Uptime, Audio Engine และสถานะ VPN',
                        '`/gproxy` - เช็คและจัดการระบบเครือข่าย VPN / Smart Proxy',
                        '`/gping` - ตรวจสอบความหน่วงและปิงของบอท',
                        '`/ghelp` - เปิดหน้าต่างคู่มือนี้'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: isEn ? '⚡ Powered by GOOLIX Cosmic Slime DJ Engine 🟢' : '⚡ ขับเคลื่อนโดย GOOLIX Cosmic Slime DJ Engine 🟢',
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
