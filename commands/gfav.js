const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const favoriteManager = require('../src/helpers/favoriteManager');
const settingsManager = require('../src/helpers/settingsManager');
const i18n = require('../src/helpers/i18nHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gfav')
        .setDescription('Manage your favorite tracks (Favorites)')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Save currently playing track to your favorites')
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all your saved favorite tracks')
        )
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Load and play all your favorite tracks')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a track from your favorites list')
                .addIntegerOption(opt =>
                    opt.setName('number')
                        .setDescription('Position number in your favorites list to remove')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    run: async (client, interaction, kazagumo) => {
        const guildId = interaction.guild.id;
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const embed = new EmbedBuilder().setColor('#FF69B4');

        if (sub === 'add') {
            const player = kazagumo.players.get(guildId);
            if (!player || !player.playing || !player.queue.current) {
                embed.setDescription(i18n.t(guildId, 'FAV_NO_PLAYING'));
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            const track = player.queue.current;
            const added = favoriteManager.addFavorite(userId, track);
            if (added) {
                embed.setDescription(i18n.t(guildId, 'FAV_ADDED', { title: track.title }));
            } else {
                embed.setDescription(i18n.t(guildId, 'FAV_ALREADY_EXISTS', { title: track.title }));
            }
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'list') {
            const favorites = favoriteManager.getFavorites(userId);
            if (!favorites || favorites.length === 0) {
                embed.setDescription(i18n.t(guildId, 'FAV_EMPTY'));
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            embed.setTitle(i18n.t(guildId, 'FAV_LIST_TITLE', { count: favorites.length }));
            let desc = '';
            favorites.slice(0, 15).forEach((item, index) => {
                desc += `**${index + 1}.** [${item.title}](${item.uri}) - *${item.author}*\n`;
            });
            if (favorites.length > 15) {
                desc += `\n*${i18n.t(guildId, 'FAV_MORE', { count: favorites.length - 15 })}*`;
            }
            desc += `\n\n${i18n.t(guildId, 'FAV_PLAY_TIP')}`;
            embed.setDescription(desc);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'remove') {
            const index = interaction.options.getInteger('number');
            const favorites = favoriteManager.getFavorites(userId);
            if (!favorites || favorites.length === 0) {
                embed.setDescription(i18n.t(guildId, 'FAV_EMPTY'));
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            if (index < 1 || index > favorites.length) {
                embed.setDescription(i18n.t(guildId, 'INVALID_QUEUE_POS', { max: favorites.length }));
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            const target = favorites[index - 1];
            favoriteManager.removeFavorite(userId, target.identifier || target.uri);
            embed.setDescription(i18n.t(guildId, 'FAV_REMOVED', { title: target.title }));
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'play') {
            const voiceChannel = interaction.member?.voice?.channel;
            if (!voiceChannel) {
                embed.setDescription(i18n.t(guildId, 'VOICE_JOIN_REQUIRED'));
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            const favorites = favoriteManager.getFavorites(userId);
            if (!favorites || favorites.length === 0) {
                embed.setDescription(i18n.t(guildId, 'FAV_EMPTY'));
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            await interaction.deferReply();

            let player = kazagumo.players.get(guildId);
            if (!player) {
                player = await kazagumo.createPlayer({
                    guildId: guildId,
                    textId: interaction.channel.id,
                    voiceId: voiceChannel.id,
                    volume: settingsManager.getGuildVolume(guildId)
                });
            }

            let loadedCount = 0;
            for (const fav of favorites) {
                const searchRes = await kazagumo.search(fav.uri || `${fav.title} ${fav.author}`, {
                    requester: interaction.user
                });
                if (searchRes && searchRes.tracks.length > 0) {
                    player.queue.add(searchRes.tracks[0]);
                    loadedCount++;
                }
            }

            embed.setDescription(i18n.t(guildId, 'FAV_PLAY_ADDED', { count: loadedCount }));
            await interaction.followUp({ embeds: [embed] });

            if (!player.playing && !player._starting && !player.paused) {
                try {
                    await player.play();
                } catch (err) {
                    console.error('[gfav play] Play error:', err.message);
                }
            }
        }
    }
};
