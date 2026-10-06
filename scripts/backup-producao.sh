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
# aqui. Os temporarios do container sao apagados no fim, com ou sem erro.
#
# Nenhuma URL ou senha passa por este terminal: as variaveis PG* sao do container.
# O .dump tem dado pessoal de estudantes: fica fora do repositorio (padrao:
# ~/backups-simulado-fuvest) e deve ser apagado quando nao for mais necessario.
set -euo pipefail
umask 077  # o dump e a saida em base64 tem dado pessoal: so o dono le

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
PARCIAL="$ARQUIVO.parcial"  # so vira o .dump depois de conferido
SAIDA="$(mktemp)"
trap 'rm -f "$SAIDA" "$PARCIAL"' EXIT  # a saida tem o dump em base64

# Script do container (sh). __NOME__ e __ENSAIO__ sao trocados antes do envio.
# Marcadores em linhas proprias (INICIO, FIM, SHA256, CONTAGEM, ENSAIO); o base64 do dump
# fica entre INICIO e FIM.
REMOTO=$(cat <<'SCRIPT'
set -e
ARQ=/tmp/__NOME__
TEMP=ensaio_restauracao_$$
limpar() {
  rm -f "$ARQ" /tmp/antes_$$ /tmp/depois_$$ /tmp/restaurado_$$
  dropdb -U "$PGUSER" --if-exists "$TEMP" >/dev/null 2>&1 || true
}
# Tambem com Ctrl-C ou a conexao caida: o dump nao pode ficar no /tmp do container
trap limpar EXIT
trap 'exit 1' HUP INT TERM
contagens() {
  for t in $(psql -U "$PGUSER" -d "$1" -tAc "select tablename from pg_tables where schemaname = 'public' order by 1"); do
    echo "$t $(psql -U "$PGUSER" -d "$1" -tAc "select count(*) from \"$t\"")"
  done | LC_ALL=C sort  # o join exige a mesma ordem nas listas
}
if [ "__ENSAIO__" = 1 ]; then contagens "$PGDATABASE" > /tmp/antes_$$; fi
pg_dump -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$ARQ"
echo "SHA256 $(sha256sum "$ARQ" | cut -d' ' -f1)"
if [ "__ENSAIO__" = 1 ]; then
  createdb -U "$PGUSER" "$TEMP"
  pg_restore -U "$PGUSER" -d "$TEMP" --no-owner --exit-on-error "$ARQ"
  contagens "$PGDATABASE" > /tmp/depois_$$
  contagens "$TEMP" > /tmp/restaurado_$$
  # Quantas tabelas em cada lista: a comparacao local recusa lista vazia ou incompleta
  echo "CONTAGEM $(wc -l < /tmp/antes_$$) $(wc -l < /tmp/restaurado_$$) $(wc -l < /tmp/depois_$$)"
  # ENSAIO tabela antes restaurado depois (o banco real pode mudar durante o backup)
  LC_ALL=C join /tmp/antes_$$ /tmp/restaurado_$$ | LC_ALL=C join - /tmp/depois_$$ | sed 's/^/ENSAIO /'
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

falhar() {
  echo "O backup falhou: $1" >&2
  echo "Saída do container (sem o conteúdo do dump):" >&2
  sed '/^INICIO$/,$d' "$SAIDA" >&2
  exit 1
}

echo "Gerando o dump no container do Postgres$([ "$ENSAIO" = 1 ] && echo ' (com ensaio de restauração)')..."
status=0
railway ssh -s Postgres "echo $B64 | base64 -d | sh" > "$SAIDA" || status=$?
[ "$status" -eq 0 ] || falhar "o railway ssh terminou com o código $status"
sed -i 's/\r$//' "$SAIDA"  # o terminal remoto pode mandar CRLF

# Marcadores so valem como linha inteira: uma linha de base64 pode comecar com "FIM"
SHA_REMOTO=$(grep -m1 '^SHA256 ' "$SAIDA" | cut -d' ' -f2 || true)
[ -n "$SHA_REMOTO" ] || falhar "o dump não foi gerado"
grep -q '^INICIO$' "$SAIDA" && grep -q '^FIM$' "$SAIDA" || falhar "a transferência veio incompleta"

if ! sed -n '/^INICIO$/,/^FIM$/p' "$SAIDA" | sed '1d;$d' | tr -d '\n' | base64 -d > "$PARCIAL"; then
  falhar "o conteúdo recebido não é base64 válido"
fi
SHA_LOCAL=$(sha256sum "$PARCIAL" | cut -d' ' -f1)
if [ "$SHA_LOCAL" != "$SHA_REMOTO" ] || [ "$(head -c 5 "$PARCIAL")" != "PGDMP" ]; then
  falhar "o arquivo chegou diferente do gerado no container (SHA-256 ou cabeçalho)"
fi

if [ "$ENSAIO" = 1 ]; then
  read -r _ n_antes n_restaurado n_depois < <(grep -m1 '^CONTAGEM ' "$SAIDA") \
    || falhar "o ensaio não informou as contagens"
  n_comparadas=$(grep -c '^ENSAIO ' "$SAIDA" || true)
  if [ "$n_antes" -eq 0 ] || [ "$n_antes" != "$n_restaurado" ] || [ "$n_antes" != "$n_depois" ] \
    || [ "$n_comparadas" != "$n_antes" ]; then
    falhar "o ensaio comparou $n_comparadas tabela(s); o banco real tem $n_antes e o restaurado, $n_restaurado"
  fi
  echo "Ensaio de restauração ($n_comparadas tabelas; no banco real / restaurado):"
  falhas=0
  while read -r _ tabela antes restaurado depois; do
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
  [ "$falhas" -eq 0 ] || falhar "o ensaio de restauração deu diferença em $falhas tabela(s)"
fi

mv "$PARCIAL" "$ARQUIVO"
echo "Backup: $ARQUIVO ($(wc -c < "$ARQUIVO" | tr -d ' ') bytes, SHA-256 $SHA_LOCAL conferido)."
echo "Tem dado pessoal de estudantes: não compartilhe e apague quando não for mais necessário."
