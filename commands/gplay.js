const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settingsManager = require('../src/helpers/settingsManager');
const subscriptionManager = require('../src/billing/subscriptionManager');

module.exports = {
    data: {
        name: 'gplay',
        description: 'เล่นเพลงจาก นกแดง / นกเขียว หรือพิมพ์ชื่อเพลง',
        options: [
            {
                name: 'query',
                type: 3, // STRING
                description: 'ชื่อเพลง หรือ ลิ้งก์ นกแดง / นกเขียว',
                required: true,
            },
            {
                name: 'top',
                type: 5, // BOOLEAN
                description: 'เล่นเพลงนี้เป็นคิวต่อไป (แซงคิว)',
                required: false,
            },
            {
                name: 'playlist',
                type: 5, // BOOLEAN
                description: 'โหลดทั้งเพลย์ลิสต์ถ้าลิ้งก์มี playlist/mix (ค่าเริ่มต้น: เล่นเฉพาะเพลงนี้)',
                required: false,
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
        const top = interaction.options.getBoolean('top');
        const forcePlaylist = Boolean(interaction.options.getBoolean('playlist'));
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

        // 2. Queue Limit Check
        if (player.queue.length >= tierConfig.maxQueue) {
            embed.setColor('#EF4444')
                .setTitle('📋 คิวเพลงเต็มโควต้าแล้วค่ะ')
                .setDescription(`เซิร์ฟเวอร์นี้มีคิวเพลงครบเพดาน **${tierConfig.maxQueue} เพลง** แล้วค่ะ!\n\n*(เซิร์ฟเวอร์ผู้สนับสนุนสามารถขยายคิวได้สูงสุดถึง 50 เพลง ร่วมสนับสนุนได้ที่ \`/gdonate\` นะคะ)*`);
            return interaction.followUp({ embeds: [embed], components: [donateRow] });
        }

        // Fast Single-Pass Search with built-in Anti-Ban and Fallback
        const result = await kazagumo.search(query, {
            requester: interaction.user,
            forcePlaylist
        });

        if (!result.tracks.length) {
            embed.setDescription('❌ หาเพลงไม่เจอค่ะ! (ลองลบคำว่า Official/MV ออก หรือพิมพ์แค่ชื่อเพลงสั้นๆ ดูนะคะ) 😿');
            return interaction.followUp({ embeds: [embed] });
        }

        if (result.type === 'PLAYLIST') {
            const addedTracks = [];
            let skippedOver30Min = 0;

            for (const track of result.tracks) {
                if (player.queue.length + addedTracks.length >= tierConfig.maxQueue) break;

                // 30-minute limit check for free tier
                if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
                    skippedOver30Min++;
                    continue;
                }
                addedTracks.push(track);
                player.queue.add(track);
            }

            let msg = `✅ จัดไปชุดใหญ่ไฟกระพริบ! เพิ่มเพลย์ลิสต์ **${result.playlistName}** (${addedTracks.length} เพลง) ลงในคิวแล้วค่ะ 💃✨`;
            if (skippedOver30Min > 0) {
                msg += `\n*(ข้ามเพลงที่ยาวเกิน 30 นาทีไป ${skippedOver30Min} เพลงสำหรับผู้ใช้ทั่วไปค่ะ)*`;
            }
            embed.setDescription(msg);
            await interaction.followUp({ embeds: [embed] });
        } else {
            const track = result.tracks[0];

            // 3. 30-minute limit check for single song
            if (!tierConfig.isSupporter && (track.duration > 1800 || track.isStream)) {
                embed.setColor('#FFD600')
                    .setTitle('⏱️ เพลงมีความยาวเกิน 30 นาที')
                    .setDescription(`เพลง **${track.title}** มีความยาว ${Math.floor(track.duration / 60)} นาที\n\nผู้ใช้ทั่วไปจำกัดความยาวไม่เกิน 30 นาทีต่อเพลงค่ะ!\nร่วมเป็น 💖 **ผู้สนับสนุนเซิร์ฟเวอร์** เพื่อปลดล็อกการเล่นคลิปยาวและ Live Stream ไม่จำกัดความยาวนะคะ~`);
                return interaction.followUp({ embeds: [embed], components: [donateRow] });
            }

            if (top && player.queue.length > 0) {
                player.queue.unshift(track);
            } else {
                player.queue.add(track);
            }
            embed.setDescription(`**${track.title}**\n\n${(player.playing || player._starting) ? (top ? `⬆️ วีไอพีสุดๆ! แซงคิวเป็นเพลงต่อไปให้แล้วค่ะ 💅` : `✅ รับแซ่บค่ะ! ดีเจสาวจับยัดลงคิวให้แล้วนะคะ เตรียมตัวโยกได้เลย 📝💋`) : `▶️ ดีเจจัดให้! เริ่มเล่นเพลงแล้วค่ะ 🎧✨`}`);
            await interaction.followUp({ embeds: [embed] });
        }

        if (!player.playing && !player._starting && !player.paused) {
            try {
                await player.play();
            } catch (error) {
                console.error('[gplay] Play error:', error.message);
                return interaction.followUp({ content: '❌ เกิดข้อผิดพลาดในการเริ่มเล่นเพลงค่ะ', flags: 64 });
            }
        }
    }
};
