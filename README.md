// I -> "id = E"
I.code = E.code + "mv (" + id.adr + "), " + E.reg + ";";

// I -> "break"
I.break = true;

// I -> "do while"
start = newLabel();
I.break = false;
I.code = E1.code + E2.code + start + ":" + LI.code + "goto< " + E1.reg + " " + E2.reg + " " + start + ";" + LI.end + ":";


// LI -> "I LI1"
LI.end = LI1.end;
if (I.break) {
    LI.code = "goto " + LI1.end + ";" + LI1.code;
} else {
	LI.code = I.code + LI1.code;
}

// LI -> "eps"
LI.end = newLabel();


// S -> "LI"
S.code = LI.code;