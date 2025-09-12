# Render Deployment Configuration

## Build & Start Commands
```
Build Command: npm ci && npm run build
Start Command: node server.mjs
```

## Environment Variables Required
```
NODE_VERSION=20.19.5
PUBLIC_BASE_URL=https://your-render-domain.onrender.com
OPENAI_API_KEY=<your-openai-api-key>
RESEND_API_KEY=<your-resend-api-key>
FROM_EMAIL=voicemail@yourdomain.com
NOTIFICATION_EMAIL=admin@yourdomain.com

# EU Locale Configuration
SUPPORTED_LOCALES=en-GB,fr-FR,de-DE,es-ES,it-IT,nl-NL
VOICE_en_GB=Polly.Brian
VOICE_fr_FR=Polly.Celine
VOICE_de_DE=Polly.Marlene
VOICE_es_ES=Polly.Lucia
VOICE_it_IT=Polly.Carla
VOICE_nl_NL=Polly.Lotte
```

## Health Check Configuration
- Health check path: `/readyz`
- Timeout: 30 seconds
- Interval: 300 seconds

## Autoscale Configuration (after green)
- Min instances: 1
- Max instances: 5
- Target CPU: 70% over 2 minutes
- Target concurrency: 25
- Auto-rollback: Enable if 5xx > 2% over 5 minutes

## Deployment Steps
1. Set all environment variables above in Render dashboard
2. Click "Clear build cache" 
3. Click "Deploy latest"
4. Verify endpoints after deployment:
   - `https://your-domain.onrender.com/healthz` → Returns "ok"
   - `https://your-domain.onrender.com/readyz` → Returns "ready"

## Twilio Configuration
After deployment, configure in Twilio Console:
- When a call comes in: `POST https://your-domain.onrender.com/voice/answer`
- Fallback URL: Configure a TwiML Bin as safety net

## Verification
- Place test call → Hear locale-specific greeting → Leave message
- Check email for transcript with AI summary
- Monitor Twilio console for call status (should show "Completed")