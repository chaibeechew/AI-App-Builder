FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /srv/laneriq-email-transport

COPY services/email-transport-node/server.mjs ./server.mjs

RUN addgroup -S laneriq && adduser -S -G laneriq laneriq \
  && chown -R laneriq:laneriq /srv/laneriq-email-transport

USER laneriq
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node","server.mjs"]
