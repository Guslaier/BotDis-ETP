const onboardingHelper = require('../src/helpers/onboardingHelper');

module.exports = {
    data: {
        name: 'gwelcome',
        description: 'Display onboarding welcome card and language selector'
    },
    run: async (client, interaction) => {
        const card = onboardingHelper.createWelcomeCard(client, interaction.guild);
        return interaction.reply(card);
    }
};
