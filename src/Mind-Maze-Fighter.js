// =================================================================================================
// Sample Mind for more complex starter WWM World
// =================================================================================================




// World tells us agent position and enemy position
// World does not tell us of existence of walls
// if return invalid move (not empty square) World just ignores it and we miss a turn




function randomPick ( a, b )
{
    if ( randomBoolean() )
        return a;
    else
        return b;
}




function Mind() {


//--- public functions / interface / API ----------------------------------------------------------


    this.newRun = function()
    {
    };

    this.endRun = function()
    {
    };



    this.getAction = function ( x )		// x is an array of [ ai, aj, ei, ej ]
    {
        var ai = x[0];
        var aj = x[1];
        var ei = x[2];
        var ej = x[3];

        // if strictly move away, will get stuck at wall, so introduce randomness

        if ( ej < aj ) 	return ( randomPick ( ACTION_UP,	randomPick(ACTION_RIGHT,ACTION_LEFT) 	));
        if ( ej > aj ) 	return ( randomPick ( ACTION_DOWN,	randomPick(ACTION_RIGHT,ACTION_LEFT) 	));

        if ( ei < ai ) 	return ( randomPick ( ACTION_RIGHT,	randomPick(ACTION_UP,ACTION_DOWN) 		));
        if ( ei > ai ) 	return ( randomPick ( ACTION_LEFT,	randomPick(ACTION_UP,ACTION_DOWN) 		));

        return  ( randomintAtoB (0,3) );
    };
}



