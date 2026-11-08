const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: {
        name: 'gqueue',
        description: 'View current song queue and upcoming playlist',
    },
    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const player = kazagumo.players.get(guildId);
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (!player || (!player.playing && player.queue.length === 0)) {
            embed.setDescription(i18n.t(guildId, 'NO_QUEUE'));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const queue = player.queue;
        if (queue.length === 0) {
            embed.setTitle(i18n.t(guildId, 'QUEUE_TITLE_CURRENT'));
            const currentTitle = queue.current.title ? queue.current.title.replace(/\[/g, '(').replace(/\]/g, ')') : "Unknown";
            embed.setDescription(`**${i18n.t(guildId, 'QUEUE_NOW_PLAYING_LABEL')}**\n[${currentTitle}](${queue.current.uri}) - ${i18n.t(guildId, 'QUEUE_REQUESTED_BY_LABEL')} <@${queue.current.requester.id}>\n\n${i18n.t(guildId, 'QUEUE_EMPTY_NEXT')}`);
            return interaction.reply({ embeds: [embed] });
        }

        const tracksPerPage = 10;
        const totalPages = Math.ceil(queue.length / tracksPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * tracksPerPage;
            const end = start + tracksPerPage;
            const currentTracks = queue.slice(start, end);

            const currentTitle = queue.current.title ? queue.current.title.replace(/\[/g, '(').replace(/\]/g, ')') : "Unknown";
            let description = `**${i18n.t(guildId, 'QUEUE_NOW_PLAYING_LABEL')}**\n[${currentTitle}](${queue.current.uri}) - ${i18n.t(guildId, 'QUEUE_REQUESTED_BY_LABEL')} <@${queue.current.requester.id}>\n\n**${i18n.t(guildId, 'QUEUE_PAGE_HEADER', { page: page + 1, total: totalPages })}**\n`;

            currentTracks.forEach((track, index) => {
                let title = track.title ? track.title.replace(/\[/g, '(').replace(/\]/g, ')') : "Unknown";
                if (title.length > 40) title = title.substring(0, 40) + '...';
                description += `**${start + index + 1}.** [${title}](${track.uri}) - ${i18n.t(guildId, 'QUEUE_REQUESTED_BY_LABEL')} <@${track.requester.id}>\n`;
            });

            const newEmbed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle(i18n.t(guildId, 'QUEUE_ALL_TITLE', { count: queue.length }))
                .setDescription(description)
                .setFooter({ text: i18n.t(guildId, 'QUEUE_FOOTER') });

            return newEmbed;
        };

        const getButtons = (page) => {
            const row = new ActionRowBuilder();

            const btnPrev = new ButtonBuilder()
                .setCustomId('queue_prev')
                .setLabel(i18n.t(guildId, 'QUEUE_BTN_PREV'))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0);

            const btnNext = new ButtonBuilder()
                .setCustomId('queue_next')
                .setLabel(i18n.t(guildId, 'QUEUE_BTN_NEXT'))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1);

            row.addComponents(btnPrev, btnNext);
            return row;
        };

        const initialEmbed = generateEmbed(currentPage);

        if (totalPages === 1) {
            return interaction.reply({ embeds: [initialEmbed] });
        }

        const response = await interaction.reply({
            embeds: [initialEmbed],
            components: [getButtons(currentPage)],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: i18n.t(guildId, 'QUEUE_ONLY_INVOKER'), flags: 64 });
            }

            if (i.customId === 'queue_prev') {
                currentPage--;
            } else if (i.customId === 'queue_next') {
                currentPage++;
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [getButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};
