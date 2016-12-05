






function Mind() {


//--- public functions / interface / API ----------------------------------------------------------


    this.newRun = function()
    {
    };


    this.getAction = function ( x )		// x is an array of [ ai, aj, ei, ej ]
    {
        var ai = x[0];
        var aj = x[1];
        var ei = x[2];
        var ej = x[3];

        // if strictly move away, will get stuck at wall, so introduce randomness

        if ( ej < aj ) 	return ( randomPick ( ACTION_UP,	randomPick ( ACTION_UP, 	randomPick(ACTION_RIGHT,ACTION_LEFT) 	)));
        if ( ej > aj ) 	return ( randomPick ( ACTION_DOWN,	randomPick ( ACTION_DOWN, 	randomPick(ACTION_RIGHT,ACTION_LEFT) 	)));

        if ( ei < ai ) 	return ( randomPick ( ACTION_RIGHT,	randomPick ( ACTION_RIGHT,	randomPick(ACTION_UP,ACTION_DOWN) 		)));
        if ( ei > ai ) 	return ( randomPick ( ACTION_LEFT,	randomPick ( ACTION_LEFT,	randomPick(ACTION_UP,ACTION_DOWN) 		)));

        return  ( randomintAtoB (0,3) );
    };



    this.endRun = function()
    {
    };


}



