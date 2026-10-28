# Social screenshot rewards

The `/rewards` hub combines the existing optional rewarded-ad offer with configured social follow campaigns. Social claims are currently disabled by default. A campaign must be configured with the exact official profile URL, display name, handle, platform and credit amount before it appears.

## Campaign configuration

Set the non-secret `SOCIAL_REWARD_CAMPAIGNS_JSON` variable in `wrangler.jsonc` or the deployment environment to a JSON array:

```json
[
  {
    "id": "instagram-follow",
    "platform": "Instagram",
    "title": "Follow ModHorizon on Instagram",
    "accountName": "ModHorizon",
    "accountHandle": "modhorizon",
    "profileUrl": "https://www.instagram.com/modhorizon/",
    "credits": 1
  }
]
```

Supported platforms are Instagram, TikTok and YouTube. Profile URLs must use their official HTTPS host. Campaign IDs must be unique, and rewards are limited to 1–5 credits per account. Configure `SOCIAL_REWARDS_ENABLED=true` only after the campaign details and review provider are ready. Confirm the social platform's current rules before offering a reward for follows.

## Screenshot review

The server validates the PNG/JPEG signature, dimensions and 768 KB limit, then sends the image in memory to the configured OpenAI Responses API model for a strict JSON review. `OPENAI_API_KEY` is required; `SOCIAL_REWARD_REVIEW_MODEL` defaults to `gpt-6-luna`. The model approves only if the configured account and a visible Following state match with confidence at least 0.92. Unclear screenshots are rejected. The screenshot is not written to ModHorizon's D1 media storage or logs. The external AI provider receives the image and its own data-processing/retention terms apply.

AI review is a low-confidence fraud filter, not proof: screenshots can be reused, edited or become stale after a user unfollows. There is one submission per account and campaign, and three campaign reviews per account per UTC day. A reward is a personal-use credit, not cash. Social credits expire seven days after approval.

## Credit accounting

Migration `0010_social_rewards.sql` adds a separate expiring social-credit bucket and reservation records. Credits are spent in this order: weekly/monthly allowance, ad rewards, social rewards, purchased credits. Unused social credits return after a refunded or partially used generation only while the original reward is unexpired. Expiration and account deletion remove the corresponding balance and ledger entries.

Before activation, apply the migration to the intended environment and configure at least one verified official account URL. No production migration or deployment is performed by this feature change.
