const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const subscriptionManager = require('../src/billing/subscriptionManager');

module.exports = {
    data: {
        name: 'gplaylist',
        description: 'เล่นเพลย์ลิสต์จาก นกแดง หรือ เมฆส้ม (เพิ่มทุกเพลงลงในคิว)',
        options: [
            {
                name: 'query',
                type: 3, // STRING
                description: 'ชื่อเพลย์ลิสต์ หรือ ลิ้งก์ Playlist (นกแดง, Mix, เมฆส้ม)',
                required: true,
            },
            {
                name: 'limit',
                type: 4, // INTEGER
                description: 'จำนวนเพลงสูงสุดที่จะดึงเข้าคิว (ค่าเริ่มต้น: 25, สูงสุด: 50)',
                required: false,
                min_value: 5,
                max_value: 50,
            },
        ],
    },
    run: async (client, interaction, kazagumo) => {
        const voiceChannel = interaction.member?.voice?.channel;
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!voiceChannel) {
            embed.setDescription('❌ อ๊ะๆ! ตัวเธอต้องเข้าห้องเสียงก่อนนะคะ เดี๋ยวดีเจเหงาแย่เลย~ 🥺');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const host = process.env.PUBLIC_WEB_URL || `http://${process.env.VPN_SOURCE_IP || '15.235.164.106'}:${process.env.WEB_PORT || '3000'}`;
        const donateUrl = `${host}/donate?guildId=${interaction.guild.id}&userId=${interaction.user.id}`;
        const donateRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('💖 ร่วมสนับสนุนเซิร์ฟเวอร์ (ช่องด่วน VIP)')
                .setStyle(ButtonStyle.Link)
                .setURL(donateUrl)
        );

        // 1. Slot Guard Check
        const slotCheck = subscriptionManager.checkStreamSlot(interaction.guild.id, kazagumo, client);
        if (!slotCheck.allowed) {
            embed.setColor('#FFD600')
                .setTitle('⚠️ ช่องสัญญาณเซิร์ฟเวอร์เต็ม')
                .setDescription(slotCheck.message);
            return interaction.reply({ embeds: [embed], components: [donateRow] });
        }

        const tierConfig = subscriptionManager.getTierConfig(interaction.guild.id);
        const query = interaction.options.getString('query');
        const limit = interaction.options.getInteger('limit') || 25;
        await interaction.deferReply();

        let player = kazagumo.players.get(interaction.guild.id);
        if (!player) {
            player = await kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: voiceChannel.id,
                volume: settingsManager.getGuildVolume(interaction.guild.id)
            });
        }

        const result = await kazagumo.search(query, {
            requester: interaction.user,
            forcePlaylist: true,
            limit
        });

        if (!result.tracks.length) {
            embed.setDescription('❌ หาเพลย์ลิสต์ไม่เจอค่ะ! (กรุณาตรวจสอบว่าลิ้งก์ไม่ได้ตั้งเป็น Private หรือพิมพ์ชื่อเพลย์ลิสต์ให้ชัดเจนขึ้นนะคะ) 😿');
            return interaction.followUp({ embeds: [embed] });
        }

        const addedTracks = [];
        let skippedOver30Min = 0;

        for (const track of result.tracks) {
            if (player.queue.length + addedTracks.length >= tierConfig.maxQueue) break;

            if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
                skippedOver30Min++;
                continue;
            }
            addedTracks.push(track);
            player.queue.add(track);
        }

        let desc = `✅ จัดไปชุดใหญ่ไฟกระพริบ! เพิ่มเพลย์ลิสต์ **${result.playlistName}** (${addedTracks.length} เพลง) ลงในคิวแล้วค่ะ 💃✨`;
        if (skippedOver30Min > 0) {
            desc += `\n*(ข้ามเพลงที่ยาวเกิน 30 นาทีไป ${skippedOver30Min} เพลงสำหรับผู้ใช้ทั่วไปค่ะ)*`;
        }
        if (player.queue.length >= tierConfig.maxQueue) {
            desc += `\n*(คิวเต็มเพดาน ${tierConfig.maxQueue} เพลงแล้วค่ะ อัปเกรดเป็นผู้สนับสนุนเพื่อขยายเป็น 50 เพลงที่ \`/gdonate\` นะคะ)*`;
        }

        embed.setDescription(desc);
        await interaction.followUp({ embeds: [embed] });

        if (!player.playing && !player._starting && !player.paused) {
            try {
                await player.play();
            } catch (error) {
                console.error('[gplaylist] Play error:', error.message);
                return interaction.followUp({ content: '❌ เกิดข้อผิดพลาดในการเริ่มเล่นเพลงค่ะ', flags: 64 });
            }
        }
    }
};
