/*
 * If run short of arguments items, following items fill `undefined' class. 
 */
function toStr(s) {
    if((typeof(s))=="undefined" || s.length == 0) {
        return "";
    }
    var t = "";
	var len = s.length;
	try {
		for (var i = 0; i < len; ++i)
			t += s[i].toString();
	} catch (err) {
		WScript.Echo("In to_String() :", err.description);
	}
	return t;
}

function WriteLine(s) {
	var str = toStr(arguments);
    WScript.StdOut.WriteLine(str);
}

function WriteErr(s) {
	var str = toStr(arguments);
    WScript.StdErr.WriteLine(str);
}

function fillChars(c, len) {
	var ret = new Array();
	for (var i = 0; i < len; ++i) 
		ret.push(c);
	return ret.join("");
}

function assert(testcase) {
	var test = eval(testcase);
	var abort = function() {
		WScript.Quit(-1);
	}
	var fail = function(x) {
		WScript.StdErr.WriteLine("Fail at : " + x);
	}
	if (test)
		return true;
	else {
		fail(testcase);
		abort();
	}
	return false; // not reach
}

function toHex(n) {
	return n.toString(16);
}

//////////////////////////////////////////////////////////////
// From http://groups.google.com/group/microsoft.public.scripting.jscript/msg/db2ce6d6aef679e3?hl=ja
//////////////////////////////////////////////////////////////
function toSafeArray(ary) {
	var dictionary = new ActiveXObject("Scripting.Dictionary");
	for (var i = 0; i < ary.length; ++i)
		dictionary.add(i, ary[i]);
	return dictionary.items();
}

function test_assert() {
	assert('typeof(String("")) == typeof("hoge")');
	assert('100 == 200');
}

function test_WriteLine() {
WriteLine();
WriteLine("aaa", "bbb", "ccc", 100, 200);
WriteLine(null);
WriteLine();
}
function test_fillChars() {
	var len = 10;
	assert(fillChars('#', len).length == len);
}

