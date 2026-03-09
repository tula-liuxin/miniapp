$ErrorActionPreference = "Stop"
netsh advfirewall firewall add rule name="MiniApp Mock Server 3100" dir=in action=allow protocol=TCP localport=3100
