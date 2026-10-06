#!/usr/bin/env bash
# Backup do banco de producao (CR-014, Deploy Guide §6).
#
#   scripts/backup-producao.sh [--ensaio] [--destino DIR]
#
# O Postgres da Railway nao tem URL publica (sem proxy TCP) e esta maquina nao tem o cliente
# do PostgreSQL: o pg_dump roda dentro do container do servico Postgres, pelo `railway ssh`.
# O script remoto viaja em base64 (o `railway ssh` perde as aspas de um comando com
# parenteses) e faz um unico dump num arquivo temporario: calcula o SHA-256, e com --ensaio
# restaura ESSE arquivo num banco temporario do servidor, compara as contagens de cada tabela
# com o banco real e apaga o temporario. O arquivo chega em base64 e o checksum e conferido
# aqui. O temporario do container e apagado no fim, com ou sem erro.
#
# Nenhuma URL ou senha passa por este terminal: as variaveis PG* sao do container.
# O .dump tem dado pessoal de estudantes: fica fora do repositorio (padrao:
# ~/backups-simulado-fuvest) e deve ser apagado quando nao for mais necessario.
set -euo pipefail

ENSAIO=0
DESTINO="$HOME/backups-simulado-fuvest"
while [ $# -gt 0 ]; do
  case "$1" in
    --ensaio) ENSAIO=1 ;;
    --destino)
      DESTINO="${2:?--destino precisa de um diretorio}"
      shift
      ;;
    -h | --help)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Opção desconhecida: $1 (use --ensaio e --destino DIR)" >&2
      exit 2
      ;;
  esac
  shift
done

command -v railway >/dev/null || { echo "A CLI da Railway (railway) não está instalada." >&2; exit 1; }

NOME="simulado-fuvest_$(date +%Y%m%d_%H%M%S).dump"
mkdir -p "$DESTINO"
ARQUIVO="$DESTINO/$NOME"
SAIDA="$(mktemp)"
trap 'rm -f "$SAIDA"' EXIT  # a saida tem o dump em base64

# Script do container (sh). __NOME__ e __ENSAIO__ sao trocados antes do envio.
REMOTO=$(cat <<'SCRIPT'
set -e
ARQ=/tmp/__NOME__
TEMP=ensaio_restauracao
limpar() {
  rm -f "$ARQ"
  dropdb -U "$PGUSER" --if-exists "$TEMP" >/dev/null 2>&1 || true
}
trap limpar EXIT
contagens() {
  for t in $(psql -U "$PGUSER" -d "$1" -tAc "select tablename from pg_tables where schemaname = 'public' order by 1"); do
    echo "$t $(psql -U "$PGUSER" -d "$1" -tAc "select count(*) from \"$t\"")"
  done | LC_ALL=C sort  # o join exige a mesma ordem nas duas listas
}
if [ "__ENSAIO__" = 1 ]; then contagens "$PGDATABASE" > /tmp/antes_$$; fi
pg_dump -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$ARQ"
echo "SHA256 $(sha256sum "$ARQ" | cut -d' ' -f1)"
if [ "__ENSAIO__" = 1 ]; then
  dropdb -U "$PGUSER" --if-exists "$TEMP"
  createdb -U "$PGUSER" "$TEMP"
  pg_restore -U "$PGUSER" -d "$TEMP" --no-owner --exit-on-error "$ARQ"
  contagens "$PGDATABASE" > /tmp/depois_$$
  contagens "$TEMP" > /tmp/restaurado_$$
  # ENSAIO tabela antes restaurado depois (o banco real pode mudar durante o backup)
  LC_ALL=C join /tmp/antes_$$ /tmp/restaurado_$$ | LC_ALL=C join - /tmp/depois_$$ | sed 's/^/ENSAIO /'
  rm -f /tmp/antes_$$ /tmp/depois_$$ /tmp/restaurado_$$
  dropdb -U "$PGUSER" "$TEMP"
fi
echo INICIO
base64 "$ARQ"
echo FIM
SCRIPT
)
REMOTO=${REMOTO//__NOME__/$NOME}
REMOTO=${REMOTO//__ENSAIO__/$ENSAIO}
B64=$(printf '%s' "$REMOTO" | base64 -w0)

echo "Gerando o dump no container do Postgres$([ "$ENSAIO" = 1 ] && echo ' (com ensaio de restauração)')..."
railway ssh -s Postgres "echo $B64 | base64 -d | sh" > "$SAIDA"

SHA_REMOTO=$(grep -m1 '^SHA256 ' "$SAIDA" | cut -d' ' -f2 | tr -d '\r' || true)
if [ -z "$SHA_REMOTO" ] || ! grep -q '^FIM' "$SAIDA"; then
  echo "O backup falhou. Saída do container (sem o conteúdo do dump):" >&2
  sed '/^INICIO/,$d' "$SAIDA" >&2
  exit 1
fi

sed -n '/^INICIO/,/^FIM/p' "$SAIDA" | sed '1d;$d' | tr -d '\r\n' | base64 -d > "$ARQUIVO"
SHA_LOCAL=$(sha256sum "$ARQUIVO" | cut -d' ' -f1)
if [ "$SHA_LOCAL" != "$SHA_REMOTO" ] || [ "$(head -c 5 "$ARQUIVO")" != "PGDMP" ]; then
  rm -f "$ARQUIVO"
  echo "O arquivo chegou diferente do gerado no container (SHA-256 ou cabeçalho): apagado." >&2
  exit 1
fi

if [ "$ENSAIO" = 1 ]; then
  echo "Ensaio de restauração (tabela: no banco real / restaurado):"
  falhas=0
  while read -r _ tabela antes restaurado depois; do
    depois=${depois%$'\r'}
    if [ "$antes" = "$restaurado" ] && [ "$depois" = "$restaurado" ]; then
      echo "  $tabela: $restaurado / $restaurado"
    elif [ "$antes" != "$depois" ] && [ "$restaurado" -ge "$(( antes < depois ? antes : depois ))" ] \
      && [ "$restaurado" -le "$(( antes > depois ? antes : depois ))" ]; then
      echo "  $tabela: mudou durante o backup ($antes → $depois); restaurado $restaurado"
    else
      echo "  $tabela: DIFERENTE (real $antes → $depois, restaurado $restaurado)"
      falhas=$((falhas + 1))
    fi
  done < <(grep '^ENSAIO ' "$SAIDA")
  if [ "$falhas" -gt 0 ]; then
    echo "O ensaio de restauração falhou em $falhas tabela(s). O arquivo foi mantido para análise: $ARQUIVO" >&2
    exit 1
  fi
fi

echo "Backup: $ARQUIVO ($(wc -c < "$ARQUIVO" | tr -d ' ') bytes, SHA-256 $SHA_LOCAL conferido)."
echo "Tem dado pessoal de estudantes: não compartilhe e apague quando não for mais necessário."
