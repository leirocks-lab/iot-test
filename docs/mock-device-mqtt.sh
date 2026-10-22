#!/bin/bash
# ============================================================================
# 真 MQTT 设备上行模拟脚本（mTLS 直连 AWS IoT Core 8883）
#
# 一条命令完成：自动补建 thing（如缺）→ 生成设备证书 → 绑定 thing/policy
#             → mosquitto_pub 以真 MQTT(mTLS) 发布 Shadow 消息 → 清理临时私钥
#
# 链路：设备(MQTT mTLS) → AWS IoT Core → Rule(thing/#) → SQS → iot-server 落库
#       与真实固件协议完全一致（走 shadow topic + 证书鉴权）。
#
# 部署环境：47.107.80.36 /opt/rowan/deploy
#
# 用法：
#   bash mock-device-mqtt.sh -d <device_key> [--data '<json>']
#
# 参数：
#   -d, --device <device_key>  设备标识，dev_ 前缀（裸数字自动补），也是 thing name
#   --data <json>              属性平铺 JSON（自动包装成 state.reported）
#   -p, --payload <json>       完整 shadow payload（覆盖 --data 包装）
#   -t, --topic <topic>        完整 topic（默认 $aws/things/{device}/shadow/update）
#   --qos <0|1>                QoS，默认 1
#   --endpoint <url>           默认 a1tr1j1rc3dn2o-ats.iot.ap-southeast-2.amazonaws.com
#   --region <region>          默认 ap-southeast-2
#   --policy <name>            IoT Policy，默认 rowan-device-default
#   --env-file <path>          凭证文件，默认 /opt/rowan/deploy/.env
#   --keep-cert                保留临时证书/私钥（默认发完即删，符合私钥不落地红线）
#   --verbose                  打印 mosquitto 连接详情（CONNACK/PUBACK）
#   --dry-run                  只打印命令，不执行
#   -h, --help                 帮助
#
# 凭证加载顺序（与 aws-smoke-test.sh 一致）：
#   1) 当前 shell 已 export 的 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
#   2) 否则自动读取 $ENV_FILE（默认 /opt/rowan/deploy/.env）
#   3) 否则回退到 ~/.aws/credentials
#
# 前置依赖：aws cli、mosquitto-clients、python3、curl
# ============================================================================

set -uo pipefail

# ---------- 默认配置 ----------
REGION="ap-southeast-2"
ENDPOINT="a1tr1j1rc3dn2o-ats.iot.ap-southeast-2.amazonaws.com"
ENV_FILE="/opt/rowan/deploy/.env"
POLICY="rowan-device-default"
QOS=1
CA_FILE="/tmp/AmazonRootCA1.pem"

# ---------- 命令与参数 ----------
DEVICE=""
DATA=""
TOPIC=""
PAYLOAD=""
DRY_RUN=0
KEEP_CERT=0
VERBOSE=0

WORKDIR=""
CERT_ID=""

die() { echo "❌ $1" >&2; exit 1; }
info() { echo "$1"; }

usage() {
    sed -n '2,37p' "$0" | sed 's/^# \{0,1\}//'
}

# 设备标识归一化：裸数字自动补 dev_ 前缀
normalize_device() {
    case "$1" in
        dev_*) printf '%s' "$1" ;;
        *)     printf 'dev_%s' "$1" ;;
    esac
}

# 凭证加载：环境变量 → .env → ~/.aws
load_credentials() {
    [ -n "${AWS_ACCESS_KEY_ID:-}" ] && return 0
    if [ -f "$ENV_FILE" ]; then
        local _ak _sk
        _ak=$(grep -E '^AWS_ACCESS_KEY_ID=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d "\"'")
        _sk=$(grep -E '^AWS_SECRET_ACCESS_KEY=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d "\"'")
        if [ -n "$_ak" ] && [ -n "$_sk" ]; then
            export AWS_ACCESS_KEY_ID="$_ak"
            export AWS_SECRET_ACCESS_KEY="$_sk"
        fi
        unset _ak _sk
    fi
}

# 依赖检查
check_deps() {
    command -v aws          >/dev/null 2>&1 || die "未找到 aws cli"
    command -v mosquitto_pub >/dev/null 2>&1 || die "未找到 mosquitto_pub（apt-get install -y mosquitto-clients）"
    command -v python3      >/dev/null 2>&1 || die "未找到 python3"
    command -v curl         >/dev/null 2>&1 || die "未找到 curl"
}

# thing 确保存在（不存在则创建）
ensure_thing() {
    if aws iot describe-thing --thing-name "$DEVICE" --region "$REGION" >/dev/null 2>&1; then
        info "✅ thing 已存在: $DEVICE"
    else
        info "→ 创建 thing: $DEVICE"
        aws iot create-thing --thing-name "$DEVICE" --region "$REGION" >/dev/null \
            || die "create-thing 失败"
        info "✅ thing 已创建: $DEVICE"
    fi
}

# 退出清理：删除证书（force） + 临时私钥
cleanup() {
    if [ "$KEEP_CERT" = "1" ]; then
        [ -n "$WORKDIR" ] && info "💾 证书/私钥保留在: $WORKDIR"
        return
    fi
    if [ -n "$CERT_ID" ]; then
        aws iot delete-certificate --certificate-id "$CERT_ID" --force-delete \
            --region "$REGION" >/dev/null 2>&1
    fi
    [ -n "$WORKDIR" ] && rm -rf "$WORKDIR"
}

# ---------- 参数解析 ----------
while [ $# -gt 0 ]; do
    case "$1" in
        -d|--device)  DEVICE="${2:-}";  shift 2 ;;
        --data)       DATA="${2:-}";    shift 2 ;;
        -t|--topic)   TOPIC="${2:-}";   shift 2 ;;
        -p|--payload) PAYLOAD="${2:-}"; shift 2 ;;
        --qos)        QOS="${2:-1}";    shift 2 ;;
        --endpoint)   ENDPOINT="${2:-}"; shift 2 ;;
        --region)     REGION="${2:-}";  shift 2 ;;
        --policy)     POLICY="${2:-}";  shift 2 ;;
        --env-file)   ENV_FILE="${2:-}"; shift 2 ;;
        --keep-cert)  KEEP_CERT=1;      shift ;;
        --verbose)    VERBOSE=1;        shift ;;
        --dry-run)    DRY_RUN=1;        shift ;;
        -h|--help)    usage; exit 0 ;;
        *) die "未知参数: $1" ;;
    esac
done

[ -n "$DEVICE" ] || die "需要 --device <device_key>"
DEVICE=$(normalize_device "$DEVICE")

case "$QOS" in
    0|1) ;;
    *) die "--qos 只支持 0 或 1" ;;
esac

# ---------- 构造 topic 与 payload ----------
[ -n "$TOPIC" ] || TOPIC="\$aws/things/${DEVICE}/shadow/update"

if [ -n "$PAYLOAD" ]; then
    SHADOW_PAYLOAD="$PAYLOAD"
elif [ -n "$DATA" ]; then
    SHADOW_PAYLOAD=$(python3 -c "import json,sys;print(json.dumps({'state':{'reported':json.loads(sys.argv[1])}}))" "$DATA") \
        || die "--data 不是合法 JSON"
else
    SHADOW_PAYLOAD='{"state":{"reported":{"power":true,"temperature":25.5,"humidity":60}}}'
fi

echo "============================================================"
echo "  真 MQTT 设备上行模拟（mTLS → AWS IoT Core）"
echo "============================================================"
echo "  device   : $DEVICE"
echo "  endpoint : $ENDPOINT"
echo "  topic    : $TOPIC"
echo "  payload  : $SHADOW_PAYLOAD"
echo "  qos      : $QOS"
echo "  dry-run  : $([ "$DRY_RUN" = "1" ] && echo yes || echo no)"
echo ""

if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] 将执行：确保 thing → 生成证书 → 绑定 → mosquitto_pub 发 Shadow"
    exit 0
fi

check_deps
load_credentials

WORKDIR=$(mktemp -d /tmp/mock-mqtt.XXXXXX)
trap cleanup EXIT

# 1. 确保 thing 存在
ensure_thing

# 2. 生成证书 + 私钥
info "→ 生成设备证书 ..."
aws iot create-keys-and-certificate --set-as-active --region "$REGION" > "$WORKDIR/cert.json" \
    || die "create-keys-and-certificate 失败"

CERT_ARN=$(python3 -c "import json;print(json.load(open('$WORKDIR/cert.json'))['certificateArn'])")
CERT_ID=$(basename "$CERT_ARN")
python3 -c "import json;d=json.load(open('$WORKDIR/cert.json'));open('$WORKDIR/cert.pem','w').write(d['certificatePem']);open('$WORKDIR/key.pem','w').write(d['keyPair']['PrivateKey'])"
info "✅ 证书已生成（id=${CERT_ID}）"

# 3. 绑定 thing + policy
info "→ 绑定证书到 thing ..."
aws iot attach-thing-principal --thing-name "$DEVICE" --principal "$CERT_ARN" --region "$REGION" \
    || die "attach-thing-principal 失败"

if aws iot attach-policy --policy-name "$POLICY" --target "$CERT_ARN" --region "$REGION" >/dev/null 2>&1; then
    info "✅ 已绑定 policy: $POLICY"
else
    info "⚠️  policy '$POLICY' 绑定失败（可能不存在），连接可能被拒"
fi

# 4. 确保 CA 存在
if [ ! -f "$CA_FILE" ]; then
    info "→ 下载 Amazon Root CA 1 ..."
    curl -s -o "$CA_FILE" https://www.amazontrust.com/repository/AmazonRootCA1.pem \
        || die "下载 CA 失败"
fi

# 5. 发送真 MQTT Shadow 消息
info "→ mosquitto_pub 发送 Shadow 消息 ..."
MOSQ_ARGS=(
    -i "$DEVICE"
    -h "$ENDPOINT"
    -p 8883
    --cafile "$CA_FILE"
    --cert "$WORKDIR/cert.pem"
    --key "$WORKDIR/key.pem"
    -t "$TOPIC"
    -m "$SHADOW_PAYLOAD"
    -q "$QOS"
)
[ "$VERBOSE" = "1" ] && MOSQ_ARGS+=(-d)

mosquitto_pub "${MOSQ_ARGS[@]}" || die "mosquitto_pub 发送失败"

info "✅ 发送成功（真 MQTT mTLS）"
info ""
info "💡 验证："
info "   docker logs --tail 30 rowan-iot-server 2>&1 | grep -E '\[aws\]|PropertyUpdate'"
info "   docker exec rowan-postgres psql -U postgres -d rowan-iot \\"
info "     -c \"SELECT id, device_key, properties FROM iot_device WHERE device_key='$DEVICE';\""
