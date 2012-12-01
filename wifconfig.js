/****************************************************************************
 * like including method: ex. eval(ReadFile(".\\this.js"));
 ***************************************************************************/
function ReadFile(fname) {
	var readonly = 1;
	var getFileSystemObject = function() {
		return WScript.CreateObject("Scripting.FileSystemObject");
	}

	file_system_object = getFileSystemObject();
	if (!file_system_object.fileExists(fname)) {
		WScript.Echo("Cannot read file : ", fname);
		return "";
	}
	var rstream, metaobj;
	try {
		rstream = file_system_object.OpenTextFile(fname, readonly);
		metaobj = rstream.ReadAll();
	} finally {
		rstream.close();
	}
	return metaobj;
}
/****************************************************************************/
eval(ReadFile(".\\utils.js")); 

/*
 * my environment are  Windows XP and Vista.
 */
var debug = false;

function IPAddress(addr) {
	this.addr = addr;
	this.check = function() {
		var base_ff = '(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)';
		var period = '\\.';
		var hat = '^';
		var doller = '$';
		var ipaddr_match_str = new RegExp(new Array(hat + base_ff, base_ff, base_ff, base_ff + doller).join(period));

		return ipaddr_match_str.test(this.addr);
	}
	this.toStr = function() {
		return this.addr;
	}
}

function NetConf(host) {
	if (typeof(host) == "undefined") {
		host = ".";
	}
	this.wmisrv = GetObject("winmgmts:{impersonationLevel=impersonate}!\\\\" + host + "\\root\\cimv2");
	// var locator = WScript.CreateObject("WbemScripting.SWbemLocator");
	// this.wmisrv = locator.ConnectServer(host, "\\root\\cimv2", "Administrator"); 
	// this.wmisrv.Security_.authenticationLevel = WbemAuthenticationLevelPktPrivacy; // ref MSDN
	// this.wmisrv.Security_.authenticationLevel = 6;
	this.vmnet = /VMnetAdapter/;
	this.items = {}; // items[index] = { desc, connect, adapter, config };

	this.attachDevices = function () {
		var id802_3 = 0x0; // why cannot have const keyword(fuck WSH!)
		var adapters = this.wmisrv.InstancesOf("Win32_NetworkAdapter");

		for (var adapter = new Enumerator(adapters); !adapter.atEnd(); adapter.moveNext()) {
			var adapter_type = adapter.item().AdapterTypeID;

			if (adapter_type == id802_3) {
				var configs = this.wmisrv.InstancesOf("Win32_NetworkAdapterConfiguration");

				for (var config = new Enumerator(configs); !config.atEnd(); config.moveNext()) {
					var a = adapter.item();
					var c = config.item();

					if ( 
					     String(a.ServiceName) == String(c.ServiceName)
					  && !String(c.ServiceName).match(this.vmnet)
					  && c.Index == a.Index
						) {
						var desc = a.Description;
						var index = a.Index;
						var is_connected = (0x2 == a.NetConnectionStatus); // connect status = 0x2 ref MSDN

						this.items[index] = { "desc" : desc, "connect" : is_connected, "adapter" : a, "config": c };
					}
				}
				
			}
		}
		if (debug)
			for (i in this.items)
				WriteLine(i + " : " + this.items[i]["adapter"].Description);
	}
	this.printDevices = function() {
		WriteLine(fillChars('-', 74));
		WriteLine("Index      MACAddress                  Description");
		for (dev in this.items) {
			var item = this.items[dev];
			var mac = item["config"].MACAddress.split(":").join(" ");
			var desc = item["adapter"].Description;
			var index = item["adapter"].index;

			WriteLine("0x" + toHex(index).toUpperCase() + (toHex(index).length == 1 ? " " : "") + 
				" ..." + mac + " ......" + desc);
		}
		WriteLine(fillChars('-', 74));
	}
	this.isIndex = function(asoc_iface) {
		if (isFinite(asoc_iface)) {
			var index = -1;
			var base = "10";
			var hexsym = new RegExp("^0x");

			if (hexsym.test(asoc_iface))
				base = "16";
			index = parseInt(asoc_iface, base);
			if (this.items[index]) 
				return index;
		}
		return -1;
	}
	this.isKeyword = function(asoc_iface) {
		if (/^s:/.test(asoc_iface)) {
			var ambiguious_word = asoc_iface.substring("s:".length, asoc_iface.length);
			var ambiguious_desc = new RegExp(ambiguious_word);
			var check_ifaces = new Array();

			for (iface_idx in this.items) {
				var desc = this.getDescription(iface_idx);

				if (ambiguious_desc.test(desc))
					check_ifaces.push(this.getItem(iface_idx));
			}
			if (check_ifaces.length > 1) {
				WriteLine("=== These interfaces are ambiguity of information from `" + asoc_iface + "' ===");
				for (ambiguious_iface in check_ifaces)
					WriteLine(ambiguious_iface + " : " + check_ifaces[ambiguious_iface]["desc"]);
				return -1;
			} else if (check_ifaces.length == 0) {
				WriteLine("no interfaces... from `" + asoc_iface + "'");
				return -1;
			} else {
				var index = check_ifaces[0]["config"].index;
				return index;
			}
		}
		return -1;
	}

	this.getInterfaceIdx = function(asoc_iface) {
		var ret = this.isIndex(asoc_iface);
		if (ret != -1) 
			return ret;
		ret = this.isKeyword(asoc_iface);
		if (ret != -1)
			return ret;
		// else {
		//	WriteLine("no matching interface... from `" + asoc_iface + "'");
			return ret;
		// }
	}
	this.getItem = function(iface_idx) {
		return this.items[iface_idx];
	}
	this.getDescription = function(iface_idx) {
		return this.items[iface_idx]["desc"];
	}
	this.getConfig = function(iface_idx) {
		return this.items[iface_idx]["config"];
	}

	this.getConfig = function(iface_idx) {
		return this.items[iface_idx]["config"];
	}
	this.getConnected = function(iface_idx) {
		return this.items[iface_idx]["connect"];
	}
	this.getStringOfIface = function(iface_idx, word) {
		config = this.getConfig(iface_idx);
		return (word + ": (" + this.getDescription(iface_idx) + ") " + config.ServiceName);
	}
	this.checkDHCP = function(iface_idx, inspectDhcp) {
		var config = this.getConfig(iface_idx);
		var is_connected = this.getConnected(iface_idx);

		if (is_connected == false)
			return ("This interface is no-connected. Please check your adapter's connection.");

		if (inspectDhcp && config.dhcpEnabled == false)  {
			return ("This interface is no-dhcp.");
		}
		return "";

	}
	this.enableDHCP = function(iface_idx) {
		var ret;
		var config = this.getConfig(iface_idx);

		ret = this.checkDHCP(iface_idx, false);
		if (ret != "") {
			WriteLine(ret);
			return;
		}
		ret = config.EnableDHCP();
		if (ret != 0)
			throw ("Cannot enable DHCP : errno(" + String(ret) + ")");

		// WScript.Sleep(2000);
		ret = config.SetDnsServerSearchOrder();
		if (ret != 0 && config.DHCPEnabled == false) 
			throw ("Cannot enable DNS : errno(" + String(ret) + ")");

		WriteLine("Enable " + this.getStringOfIface(iface_idx, "DHCP"));
	}
	this.releaseDHCP = function(iface_idx) {
		var ret;
		var config = this.getConfig(iface_idx);

		ret = this.checkDHCP(iface_idx, true);
		if (ret != "") {
			WriteLine(ret);
			return;
		}
		ret = config.ReleaseDHCPLease();
		if (ret != 0)
			throw ("Cannot release DHCP : errno(" + String(ret) + ")");
		WriteLine("Release " + this.getStringOfIface(iface_idx, "DHCP"));
	}
	this.renewDHCP = function(iface_idx) {
		var ret;
		var config = this.getConfig(iface_idx);

		WScript.Timeout = 5; // care of exceed expected time for RenewDHCPLease() method.
		ret = this.checkDHCP(iface_idx, true);
		if (ret != "") {
			WriteLine(ret);
			return;
		}
		ret = config.RenewDHCPLease();
		if (ret != 0)
			throw ("Cannot release DHCP : errno(" + String(ret) + ")");
		WriteLine("Renew " + this.getStringOfIface(iface_idx, "DHCP"));
	}

	this.enableStatic = function(iface_idx, ipaddr, subnet) {
		var ret;
		var config = this.getConfig(iface_idx);

		ret = this.checkDHCP(iface_idx, true);
		if (ret == "") {
			ret = config.ReleaseDHCPLease();
			WriteLine("Release DHCP address");
			if (ret != 0)
				throw ("Cannot release DHCP : errno(" + String(ret) + ")");
		}

		ret = config.EnableStatic(ipaddr, subnet);
		if (ret != 0)
			throw ("Cannot assign IPaddress and SubnetMask: " + ret);
		WriteLine("Static " + this.getStringOfIface(iface_idx, ""));
	}
	this.setGateways = function(iface_idx, gateways, metric) {
		// WriteLine("@@@ setGateways " + typeof(gateways));
		var ret;
		var config = this.getConfig(iface_idx);

/*
		var gate = function () {
			var h = new Array(gateways.length);
			for (x = 0; x < gateways.length; ++x) {
				h[x] = gateways[x];
			}
			return h;
		}
		*/
		ret = config.SetGateways(gateways, metric);
		if (ret != 0) {
			throw ("Cannot setup Gateways: " + ret);
		}
	}
	this.setDNSServer = function(iface_idx, dnss) {
		var ret;
		var config = this.getConfig(iface_idx);

		ret = config.SetDnsServerSearchOrder(dnss);
		if (ret != 0) {
			trheow ("Cannot setup DNS: " + ret);
		}
	}

}

function Main() {
	this.opt_dev = false;
	this.opt_help = true;
	this.opt_config = false;
	this.opt_dhcp = false;
	this.opt_static = false;
	this.opt_gateways = false;
	this.opt_dnss = false;

	this.fconfig = "";
	this.iface_idx = -1;
	this.callbackDHCP = null;

	this.default_metric = 100;
	this.metric_ary = null;

	this.callbackStatic = null;
	this.callbackGateway = null;
	this.callbackDns = null;

	this.devices = null;


	this.usage = function() {
		WriteLine("Usage: ");
		WriteLine("\twifconfig.js interface_index|associated_description dhcp enable|release|renew"); 
		WriteLine("\twifconfig.js interface_index|associated_description static ipaddr netmask addr [gateway addr,...] [dns addr,...] [metric value]"); 
		WriteLine("\twifconfig.js [-h] [-D] [-f configfile]");
	}

	this.parseOpts = function () {
		var args = WScript.Arguments;

		if (debug)
			WriteLine("@@@ args.len = " + args.length + " @@@");

		if (args.length == 3 && args.Item(1) == 'dhcp') {  // for checking DHCP method
			this.iface_idx = this.devices.getInterfaceIdx(args.Item(0));
			if (this.iface_idx == -1)
				return -1;
			var role = args.Item(2);

			this.callbackDHCP = function() { // ugly ........ 
				if (role == 'enable')
					this.devices.enableDHCP(this.iface_idx);
				else if (role == 'release')
					this.devices.releaseDHCP(this.iface_idx);
				else if (role == 'renew') 
					this.devices.renewDHCP(this.iface_idx);
				else { 
					WriteErr('Expceted keywords are enable, release or renew');
				}
			} 
			this.opt_dhcp = true;
			return 0;
		} else if (args.length >= 5 && args.Item(1) == 'static') {
			this.iface_idx = this.devices.getInterfaceIdx(args.Item(0));
			if (this.iface_idx == -1)
				return -1;
			var ipaddr = new IPAddress(args.Item(2));
			if (ipaddr.check() == false) {
				WriteErr('This address is no valid : ' + ipaddr.toStr() );
				return -2;
			}
			if (args.Item(3) != 'netmask') {
				WriteErr('Expected keyword is netmask addr');
				return -3;
			}
			var subnet = new IPAddress(args.Item(4));
			if (subnet.check() == false) {
				WriteErr('This subnet is no valid : ' + subnet.toStr() );
				return -4;
			}

			this.callbackStatic = function() {
				this.devices.enableStatic(this.iface_idx, toSafeArray(new Array(ipaddr.toStr())), toSafeArray(new Array(subnet.toStr()))) ;
			}

			this.opt_static = true; 
			
			for (var i = 5; i < args.length; ++i) {
				if (args.Item(i) == 'gateway' && args.Item(i+1)) {
					var gateways = args.Item(i+1).split(",");
					this.metric_ary = new Array();
					i++;

					for (var j = 0; j < gateways.length; ++j) {
						var a_gateway = new IPAddress(gateways[j]);
						if (a_gateway.check() == false) {
							WriteErr('This gateway address is no valid : ' + a_gateway.toStr());
							return -5;
						}
						this.metric_ary[j] = this.default_metric;
					}

					this.callbackGateway = function() {
						this.devices.setGateways(this.iface_idx, toSafeArray(gateways), toSafeArray(this.metric_ary));
					}
					this.opt_gateways = true;
				} else if (args.Item(i) == 'dns' && args.Item(i+1)) {
					var dnss = args.Item(i+1).split(",");
					i++;

					for (var j = 0; j < dnss.length; ++j) {
						dns = new IPAddress(dnss[j]);
						if (dns.check() == false) {
							WriteErr('This dns address is no valid : ' + dns.toStr());
							return -6;
						}
					}
					this.callbackDns = function() {
						this.devices.setDNSServer(this.iface_idx, toSafeArray(dnss));
					}
					this.opt_dnss = true;
				} else if (args.Item(i) == 'metric' && args.Item(i+1)) {
					var new_metric = args.Item(i+1);
					i++;

					if (isFinite(new_metric)) {
						for ( var j = 0; j < this.metric_ary.length; ++j)
							this.metric_ary[j] = parseInt(new_metric, "10");
					} else {
						WriteErr('This metric is no valid : ' + new_metric);
						return -7;
					}
				} else {
					WriteErr("Unknown keyword : " + args.Item(i));
				} 

			}
			return 0;
		}

		for (i = 0; i < args.length; ++i) { // for checking etc...
			if (debug)
				WriteLine(args.Item(i));
			if (args.Item(i) == '-D') {
				this.opt_dev = true;
			} else if (args.Item(i) == '-h') {
				this.opt_help = true;
			} else if (args.Item(i) == '-f') {
				this.opt_config = true;
				this.fconfig = args.Item(++i);
				WriteLine(args.Item(i));
			} else 
				return -3;
		}
	}

	this.run = function () {
		this.devices = new NetConf();
		this.devices.attachDevices();
		var ret = this.parseOpts();

		if (ret < 0) {
			this.usage();
			return -1;
		}
		try {
			if (this.opt_dhcp) {
				var desc = this.devices.getDescription(this.iface_idx);
				WriteLine("--- " + desc + " ----");
				this.callbackDHCP();
				WriteLine("----" + fillChars('-', desc.length) + "-----");
			} else if (this.opt_static) {
				var desc = this.devices.getDescription(this.iface_idx);
				WriteLine("--- " + desc + " ----");
				this.callbackStatic();
				if (this.opt_gateways)
					this.callbackGateway();
				if (this.opt_dnss)
					this.callbackDns();
				WriteLine("----" + fillChars('-', desc.length) + "-----");

			} else if (this.opt_dev) {
				this.devices.printDevices();
			} else if (this.opt_config) {
				// eval
			} else if (this.opt_help) {
				this.usage();
			}
		} catch (err) {
			WriteLine(err);
		} 
		return 0;
	}
}

(new Main()).run();

function test_wifconfig() {
	var wifconfig = new NetConf(".");
	wifconfig.attachDevices();
	wifconfig.getInterfaceIdx("0xb");
	wifconfig.getInterfaceIdx("11");
	wifconfig.getInterfaceIdx("s:R");
	wifconfig.getInterfaceIdx("s:gahahahahahah");
	wifconfig.printDevices();
	var index = wifconfig.getInterfaceIdx("0x1b");
	try {
		wifconfig.enableDHCP(index);
		// wifconfig.releaseDHCP(index);
		// wifconfig.renewDHCP(index);
	} catch (err) {
		WriteErr(err);
	}
}
