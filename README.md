これはなに？
================================

Unix User の場合、ifconfig を含むコンソールのコマンドで IP アドレスの
変更や gateway の指定をすることが多いと思います。
windows 上でも同様にしたいところです。
Windows では netsh がありますが、これを作った当時知らなかったという経緯があります。
そのため、windows 7、Vista、XP など互換性や検証確認を必要とする作業では、netsh を利用することをお勧めします。
ただし、WMI で自作しているためリモート WMI で制御する場合などに役立てることが出来る
かもしれません。御自由に利用してください。


現状windows XP/VISTA しか確認していません。

環境
================================
WSH で WMI + jscirpt を使用しているので、何もインストールせずに使用できます。
あとはお好みでどうぞ

例
================================
ディスク C の直下にファイル wifconfig.js を置きます。
c:\cscript wifconfig.js -h (ヘルプ)

ネットワークインターフェースデバイスの表示
================================
c:\cscript netconf.js -D 
Index      MACAddress                  Description
0xB  ...B2 A0 C9 64 BB FB ......1394 ネット アダプタ
0x19 ...00 0D 0B 49 5E 99 ......Realtek RTL8169/8110 Family Gigabit Ethernet NIC
0x1B ...00 16 6F A7 EB 98 ......Intel(R) PRO/Wireless 2915ABG Network Connection

（注意: vmware のホストデバイスは意図的に出力させていません。）

ここで、Index は、 ifconfig コマンドの eth0(linux) や fxp0(netbsd) の役割を果たします。

IP アドレスの割り当て(DHCP)
================================
Index 0x19 のデバイスを dhcp に割り当てる場合は
c:\cscript 0x19 dhcp enable
とすることで可能です。また、ipconfig の renew や release も同様に
c:\cscript 0x19 dhcp renew
c:\cscript 0x19 dhcp release
となります。

IP アドレスの割り当て(静的 IP アドレス)
================================
static ipaddress を割り当てる時は以下のように行います。
c:\cscript wifconfig.js 0x19 static 192.50.109.40 netmask 255.255.255.128

上の例は gateway や DNS に紐付いていないため、それらを割り当てたい場合
は以下のようにします。
c:\cscript 0x19 static 192.168.1.100 netmask 255.255.255.128 gateway
192.168.1.1 dns 192.168.1.251


1 つのインターフェースに対して複数のゲートウェイを割り当てることが可能
です。
これを行いたい場合は` , ' で区切ります。
c:\cscript wifconfig.js 0x19 static 192.168.1.100 netmask 255.255.255.128 gateway
192.168.1.1,192.168.1.2 dns 192.168.1.251,192.168.1.252

metric(インターフェースに対する優先順位付けの指標)も指定可能です。
metric は指定がない場合デフォルト 100 の値を利用します。windows XP の
場合、 DHCP metric は有線で 20 無線で 25 が指定されます。


備考
================================
Index の代わりに description の文字列を正規表現で引っかけることもできます。

Realtek RTL8169/8110 Family Gigabit Ethernet NIC
を例にします。

c:\cscript wifconfig.js 0x19
の代わりに
c:\cscript wifconfig.js s:Family
を行います。これにより、 Index(0x19) が代わりになります。
複数の description が引っかかった場合は、曖昧なためエラーとなります。
スペースを含ませたい場合は
c:\cscript netconf.js "s:bit Eth" としてください。
