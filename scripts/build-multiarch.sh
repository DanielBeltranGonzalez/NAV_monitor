#!/usr/bin/env bash
# build-multiarch.sh — Construye imagen Docker para linux/amd64 y linux/arm64
# Uso:
#   ./scripts/build-multiarch.sh                        # solo build local (no push)
#   ./scripts/build-multiarch.sh --push registry/imagen # build + push
#   ./scripts/build-multiarch.sh --load                 # carga solo amd64 en Docker local

set -euo pipefail

BUILDER_NAME="multiarch"
PLATFORMS="linux/amd64,linux/arm64"
IMAGE_NAME="${IMAGE_NAME:-nav-monitor}"
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "latest")

PUSH=false
LOAD=false
REGISTRY_IMAGE=""

usage() {
  echo "Uso: $0 [--push <registry/imagen>] [--load]"
  echo "  --push <registry/imagen>  Build y push al registry (ej. ghcr.io/user/nav-monitor)"
  echo "  --load                    Carga la imagen amd64 en el daemon Docker local"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --push)
      PUSH=true
      REGISTRY_IMAGE="${2:?'--push requiere el nombre de la imagen'}"
      shift 2
      ;;
    --load)
      LOAD=true
      PLATFORMS="linux/amd64"
      shift
      ;;
    --help|-h) usage ;;
    *) echo "Opción desconocida: $1"; usage ;;
  esac
done

# Verificar que el builder existe y está activo
if ! docker buildx inspect "$BUILDER_NAME" &>/dev/null; then
  echo "Creando builder '$BUILDER_NAME'..."
  docker buildx create --name "$BUILDER_NAME" --driver docker-container --bootstrap --use
else
  docker buildx use "$BUILDER_NAME"
fi

# Verificar QEMU para arm64
if [[ "$PLATFORMS" == *"arm64"* ]] && [[ ! -f /proc/sys/fs/binfmt_misc/qemu-aarch64 ]]; then
  echo "Instalando emulación QEMU..."
  docker run --rm --privileged tonistiigi/binfmt --install all
fi

echo "Plataformas : $PLATFORMS"
echo "Imagen      : $IMAGE_NAME:$VERSION"

BUILD_ARGS=(
  buildx build
  --platform "$PLATFORMS"
)

if [[ "$PUSH" == true ]]; then
  BUILD_ARGS+=(
    --tag "${REGISTRY_IMAGE}:${VERSION}"
    --tag "${REGISTRY_IMAGE}:latest"
    --push
  )
  echo "Registry    : $REGISTRY_IMAGE"
elif [[ "$LOAD" == true ]]; then
  BUILD_ARGS+=(
    --tag "${IMAGE_NAME}:${VERSION}"
    --tag "${IMAGE_NAME}:latest"
  )
  BUILD_ARGS+=(--load)
  echo "Modo        : --load (solo $PLATFORMS)"
else
  echo "Modo        : build sin push (usa --push o --load para exportar)"
fi

BUILD_ARGS+=(.)

echo ""
echo "Ejecutando: docker ${BUILD_ARGS[*]}"
echo ""

docker "${BUILD_ARGS[@]}"

echo ""
echo "Build completado: ${IMAGE_NAME}:${VERSION} [${PLATFORMS}]"
