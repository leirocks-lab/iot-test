# 蓝牙配网使用说明（Rowan AT 模组）

源码：`at_module_rowan/lf_ble_soft_center.c`（旧版） / `at_module_rowan/lf_new_ble.c`（新版）
串口：`at_module_rowan/lf_uart_center.c/.h`，`pal/inc/philips_uart.h`

## 1. 通讯口

* UART0（log 口），**波特率 2000000（2M）**。
* UART1（通讯口/AT 口），**波特率 9600**（`UART1_BAUD 9600`）。
* AT 指令以 `\r` 结尾，模组回 `OK\r\n` / `ERROR\r\n`,串口工具里勾选发送换行即可。
* 配网状态主动上报见 `lf_uart_center.h`：`+WEVENT:AP_UP`、`+WEVENT:CONNECTING`、`+WEVENT:CONNECTTED`、`+MQTTEVENT:CONNECT,SUCCESS` 等。

## 2. 开机先设置产品型号

```
AT+MODELID=CheetahIOT,Cheetah02
```

* 格式：`AT+MODELID=<series>,<modelid>\r`，解析见 `philips_save_modelid()`。
  * `series = =和,之间`，例 `CheetahIOT`
  * `modelid = ,和\r之间`，例 `Cheetah02`
* 存 flash（`LF_ENV_DEV_INFO`），掉电不丢。
* 回复：`OK\r\n`。
* **必须先设置，否则进配网直接报错 `NOT GOT MODELID!`**（`philips_ble_soft_start()` / `philips_lf_ble_soft_start()` 都会判 `strlen(modelid)==0`）。

## 3. 开启蓝牙配网

| 指令 | 宏 | 行为 |
|---|---|---|
| `AT+SOFTSTART=4\r` | `DEVICE_BLE_SOFT` | 旧版蓝牙配网，`philips_netconfig_reboot_delay_200ms(BLE_REBOOT)` |
| `AT+SOFTSTART=5\r` | `DEVICE_NEW_BLE_SOFT` | 新版蓝牙配网，`philips_netconfig_reboot_delay_200ms(NEW_BLE_REBOOT)` |

流程（两者相同）：

1. MCU 发 `AT+SOFTSTART=4/5`，模组回 `OK`。
2. 模组重启进配网模式，串口主动上报 `+WEVENT:AP_UP\r\n`。
3. 模组开 BLE 广播，手机/APP 连接后走下面协议。
4. 连上路由 → 云端激活/绑定 → 串口上报 `+WEVENT:CONNECTTED`、`+PARAMEVENT:*`、`+MQTTEVENT:CONNECT,SUCCESS`。

对照：`AT+SOFTSTART=1` 恢复出厂，`=2` AP 配网，`=3` 解绑。

## 4. 公共密钥/广播规则（新旧相同逻辑）

* BLE Key：`小写无冒号 MAC（12 字符） + modelid 前 4 字符`
  ```c
  strcpy(ble_key, g_mac_str_xiaoxie); // 如 aabbccddeeff
  strncat(ble_key, g_dev_info.modelid, 4); // Cheetah02 -> Chee, 得 aabbccddeeffChee
  ```
  注意分配至少 20 字节，旧代码 16 字节会写穿（已修）。
* 广播包 25 字节 manufacturer data：
  ```
  [0]=0x22 [1]=0x09(旧)/0x08(新) [2]=0x1C
  [3..8]=6字节MAC [9]=modelid长度 [10..]=modelid字符串
  UUID16_ALL = 0x0922（旧） / 0x0822（新，小端 22 08）
  ```
* GATT：Write `0xAAB1`，Notify `0xAAB2`。连上后主动 `exchange_mtu`。

## 5. 旧版蓝牙配网（`AT+SOFTSTART=4`）

文件：`lf_ble_soft_center.c`，服务 UUID `0x0922`。

### 5.1 APP → 模组（Write 0xAAB1）分包

首字节为包类型，后跟载荷：

| 首字节 | 含义 |
|---|---|
| `0x00` | 单包，`soft_ble_data = buf[1..]`，直接处理 |
| `0x01` | 分包首包，清空缓存开始累积 |
| `0x10` | 分包中间包，追加 |
| `0x11` | 分包尾包，追加完触发处理 |

### 5.2 两阶段：明文 → 加密

`is_encrypt==0` 时按明文 JSON 解析：

1. `{"type":"encrypt_note",...}` → 置 `is_encrypt=1`，后面全部走 AES 解密。
2. `{"type":"cipher","data":{"cipher":"<sha256_str>"}}` → 与本地 `g_sha256_str` 比对，一致则另起任务回 `cipher_reply`。

SHA256 源串（旧版）：

```
"<mac小写>,<series>,<modelid>"
如 "aabbccddeeff,CheetahIOT,Cheetah02"
mbedtls_sha256(...,0) 取前16字节 -> hex转32字符ascii -> g_sha256_str
```

`is_encrypt==1` 后：载荷为 AES-128-CBC-PKCS5 密文的 base64/字符串形式，
Key = 上述 ble_key，IV = `"0000000000000000"`，
解码函数 `Qlink_AES128CBC_PKCS5_decode()`，明文即下面 apinfo JSON。

### 5.3 apinfo 明文（核心配网数据）

```json
{"type":"apinfo","data":{
  "ssid":"LeapFive_Guest",
  "password":"www.leapfive.com",
  "binding_code":"1791525634489",
  "user_token":"0f6db37d-xxxx",
  "activate_url":"https://iot.deerma.com/device/activation",
  "certificationUrl":"https://iot.deerma.com/device/certification",
  "bindUrl":"https://iot.deerma.com/enduser/bindDevice/",
  "otaUrl":"https://iot.deerma.com/ota/updatecheck/",
  "productId":"16317890f15f4070b7772aedccf51798",
  "modelId":"Cheetah02",
  "extraData":"16317890f15f4070b7772aedccf51798"}}
```

解析 `philips_soft_info_parse()` 兼容字段：

* `bindcode`: `binding_code/bindCode/bindcode`
* `token`: `user_token/token`
* `productid`: `productId/productid/product_id`
* `ota_url`: `otaUrl/ota_url`
* `activation_url`: `activate_url/activate_Url/activationUrl/...`
* `bind_url`: `bindUrl/bind_url`
* `certification_url`: `certificationUrl/certification_url`
* `ssid/password(pwd/key)` 必需，否则不连 WiFi。
* `modelId/extraData` 只打印比对，不阻塞。

拿到 ssid/pwd 即存 `Apsoft_Info`，先回 `status_update(0)` 再 `philips_wifi_connect()`。

### 5.4 模组 → APP（Notify 0xAAB2）

`philips_ble_data_ack(type, code)`，首字节 `0x00`（单包），后跟 JSON；
加密阶段则 JSON 先 `Elink_AES128CBC_PKCS5_encode()` 再按 72 列加 `\n` 分行（`copy_send_data`）。

* `{"type":"cipher_reply","data":{"error_code":0}}`
* `{"type":"wifi_reply","data":{"error_code":0,"describe":"connected"}}` / `3 fail connected`
* `{"type":"status_update","data":{"error_code":0}}` // 已存 SSID，正在连路由
* `{"type":"cloud_reply","data":{"error_code":N,"describe":"..."}}`

`cloud_reply` code 表：

```
0 cloud connected / 1 active success / 2 active cloud return err
3 active response err / 4 active fail / 5 mqtt info success
6 mac unrecord / 7 mqtt info fail / 8 bind success
9 has super user / 10 bind fail / 11 ca info got / 12 certification error
```

### 5.5 旧版最小联调序列

```
MCU -> AT+MODELID=CheetahIOT,Cheetah02
MCU -> AT+SOFTSTART=4
APP 扫描 UUID 0x0922，连接，enable Notify(0xAAB2)
APP -W-> 0x00 + {"type":"encrypt_note"}                       // 切加密
APP -W-> 0x00 + {"type":"cipher","data":{"cipher":"<sha256>"}} // 对key
APP <-N- 0x00 + cipher_reply
APP -W-> 分包发送 AES加密后的 apinfo
模组 <-N- status_update / wifi_reply / cloud_reply
```

免 BLE 调试：CLI `ble_test_apinfo [json]` 直接喂明文走 `philips_soft_info_parse()`。

## 6. 新版蓝牙配网（`AT+SOFTSTART=5`，推荐）

文件：`lf_new_ble.c`，服务 UUID `0x0822`，逐包应答，无 0x00/0x01 分包。

### 6.1 帧格式

```
+------+------+-----+----------------+-------+
| 0xA5 | 0x5A | LEN | PAYLOAD密文LEN | CRC8  |
+------+------+-----+----------------+-------+
```

* `LEN` = 解密前/后 PAYLOAD 长度（1 字节）。
* `PAYLOAD明文 = [CMD 1字节][DATA N字节]`，N = LEN-1。
* 加密：AES-128-**CTR**，Key = 同上 ble_key，IV = 16×`0x00`（`AES_init_ctx_iv`）。
* `CRC8` = 对**明文 PAYLOAD** 查表 CRC8（初值 0x00，表见 `crc_table`），函数 `lf_crc8_check()`。
* 收包先找 `A5 5A`，校验 `LEN` 与 CRC，不对则回 `*_fail` 且不计数。

应答 `lf_package_ble_ack()` 同格式回包：`A5 5A LEN 密文 CRC8明文`。

### 6.2 APP → 模组 CMD（`ble_soft_info` 枚举）

| CMD | 字段 | 存入 | 成功回 | 失败/空回 |
|---|---|---|---|---|
| `0x00 set_chiper_app` | 16字节sha256二进制 | — | `0x80` + `0x0F`(factory sha) | `0x70` |
| `0x01 set_ssid` | ssid字符串 | `Apsoft_Info.ssid` | `0x81`+ssid回显 | `0x71` |
| `0x02 set_pwd` | wifi密码 | `Apsoft_Info.password` | `0x82`+pwd回显 | `0x72` |
| `0x03 set_token` | user_token | `Apsoft_Info.token` | `0x83 ok` | `0x73`/`0x13 token null` |
| `0x04 set_bindcode` | binding_code | `Apsoft_Info.bindcode` | `0x84 ok` | `0x74`/`0x14` |
| `0x05 set_productid` | productId | `Apsoft_Info.productid` | `0x85 ok` | `0x75`/`0x15` |
| `0x06 set_modelid` | modelId | 仅校验 | `0x86 ok` | `0x76`/`0x16`系 |
| `0x07 set_certification_url` | certificationUrl | `...certification_url` | `0x87 ok` | `0x77`/`0x17` |
| `0x08 set_activation_url` | activate_url | `...activation_url` | `0x88 ok` | `0x78`/`0x18` |
| `0x09 set_bind_url` | bindUrl | `...bind_url` | `0x89 ok` | `0x79`/`0x19` |
| `0x0A set_ota_url` | otaUrl | `...ota_url` | `0x8A ok` | `0x7A`/`0x1A` |
| `0x6F cancel_net_config` | — | 重进配网 | — | — |

`0x8F set_chiper_factory_reply` 为 APP 对模组 `0x0F` 的确认，CRC 对即 `get_info_flag++`。

sha256 校验（`0x00`）源串与旧版相同：`mac,series,modelid`；模组回 `0x0F` 时 DATA 为 `sha256(mac+",leapfive")` 的 32 字符 hex（`set_chiper_factory` 分支）。

### 6.3 模组 → APP 状态 CMD

* WiFi：`0xA0`连上(带ssid) `0xA1`连接中 `0xA2`失败(`WR,x`) `0xA3` ssid未找到 `0xA4`密码错。
* Active：`0xB0`成功(带mqtt_region) `0xB1`进行中 `0xB2/B3/B4` 云错/格式错/请求失败，`0xB8~0xBB` 404/502/NET_ERROR/ TIMEOUT。
* CARC/证书：`0xC0~0xC7`（`0xC2` mac未备案等），`0xC8~0xCB` http/网络错。
* Bind：`0xD0`成功 `0xD1`进行中 `0xD2~0xD5`（`0xD3` 11000/`0xD4` 16003），`0xD8~0xDB`。
* Cert：`0xE0`已拿到 `0xE1`获取中 `0xE2~0xE5` pk/ce/ca fail，`0xE8~0xEB`。
* MQTT：`0xF0`成功 `0xF1`连接中 `0xF2~0xFE`按 disconnect code（44/52/42/46/48/4A/4C/4E/50/43/45/47/49）。
* 通用：`0x63 unrecognizable`，`0x90 connect_ble_fail(BLE,0x..)`，`0x7F~0x7A` 各字段 fail（DATA `Error`）。

DATA 明文见 `lf_new_ble.h` 的 `*_INFO`，如 `ble connect router be in progress`。

### 6.4 新版最小联调序列

```
MCU -> AT+MODELID=CheetahIOT,Cheetah02
MCU -> AT+SOFTSTART=5
APP 扫描 UUID 0x0822，连接，enable Notify
APP -W-> A5 5A LEN AES_CTR(0x00+sha256bin) CRC8
APP <-N- A5 5A .. AES_CTR(0x80+ok) ..        // app校验过
APP <-N- A5 5A .. AES_CTR(0x0F+factory_sha) ..
APP -W-> A5 5A .. AES_CTR(0x8F+...) ..       // 确认factory
APP 依次 -W-> 0x01 ssid / 0x02 pwd / 0x03 token / 0x04 bindcode /
             0x05 productid / 0x06 modelid / 0x07 certUrl /
             0x08 activeUrl / 0x09 bindUrl / 0x0A otaUrl
  每包 <-N- 0x81..0x8A ok 回显
集齐12个(get_info_flag==12) -> 模组回 0xA1 connecting 并 philips_wifi_connect()
后续 <-N- 0xA0/0xB0/0xC0/0xD0/0xE0/0xF0 ... 直到云连接成功
```

`get_info_flag` 计数：chiper_app + factory_reply + ssid/pwd/token/bindcode/productid/modelid/cert/active/bind/ota 共 12，`set_ota_url` 收齐才触发连 WiFi。

## 7. 排错

* `NOT GOT MODELID` → 先发 `AT+MODELID`，再 `SOFTSTART`。
* 收不到广播 → 确认已进 `BLE_REBOOT/NEW_BLE_REBOOT` 且串口见 `+WEVENT:AP_UP`；旧搜 `0x0922`，新搜 `0x0822`。
* 旧版一直不回 apinfo → 确认已发 `encrypt_note`（`is_encrypt` 置 1）且 Key 为 `mac小写+modelid前4`，IV 16 个 `0`。
* 新版 `*_fail`/`CRC fail` → 查 AES-CTR（不是 CBC）与 CRC8（明文，非密文）。
* 配网中串口 `+WEVENT:CONNECTING/CONNECTTED/+PARAMEVENT/+MQTTEVENT` 可定位卡在路由/激活/绑定/证书哪一步。
