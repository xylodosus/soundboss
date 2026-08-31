FROM node:22-alpine

# ffmpeg fournit aussi ffprobe. C'est toute la raison d'être de ce conteneur :
# ces binaires sont inaccessibles depuis un runtime edge.
# aubio sert uniquement à la détection de tempo ; la tonalité demanderait un
# extracteur chroma (Essentia) et une base Debian, on s'en dispense.
RUN apk add --no-cache ffmpeg aubio

WORKDIR /app

# Couche de dépendances séparée : le cache Docker est conservé tant que le
# manifeste ne change pas.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Port 80 : convention attendue par les endpoints Bunny Magic Containers.
ENV PORT=80
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:80/health || exit 1

CMD ["node", "--experimental-strip-types", "src/server.ts"]
