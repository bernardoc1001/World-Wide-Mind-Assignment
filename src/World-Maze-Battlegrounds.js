/*
 README:
 So far I don't have much (read: anything) to show, but below you can read my plans.

 What I want to achieve:
 I want to make an arena for two AIs to fight each other.
 I want there to be a health system (100 hitpoints) and I want the behaviour of the
 AIs to change based on both their health and the items they pick
 up.

 Behaviour:
 -> both AI start with nothing
 -> hunt for weapons
 -> run from opponent

 -> AI finds a weapon
 -> start hunting opponent
 -> keep an eye out for a better weapon (lower priority than hunting opponent)

 -> if health is < 25% use one of their limited "Disengage moves", i.e get a turn or two headstart to runaway
 -> hunt for a health pickup && run from opponent

 -> I am considering adding single use portals on the map.  If an AI is fleeing, a portal will have a
 higher priority than an empty corridor, as the opponent won't be able to follow them through the
 portal

 -> I want to try and make the AI recognise walls and try to avoid dead ends.  If the AI is trapped in a
 dead end then they will be forced to fight their opponent with whatever weapon they have or else with no
 weapons i.e, fight with their "fists"


 Scoring System:
 Each AI's current score is their remaining health + how much damage they inflict on
 their opponent.  If they kill their opponent they get +100 points.  If they die
 they lose 50 points.
 There will be some maximum amount of turns to end the game if neither AI dies.

 Combat:
 -> When the AI is in range of their opponent there will be a dice roll to see if they hit or miss.
 -> weapons will have a lower damage value and an upper damage value.  On hit with will be a dice
 roll on the damage dealt within that range.

 */


// =============================================================================================
// More complex starter World for WWM
// 3d-effect Maze World (really a 2-D problem)
// Mark Humphrys, 2016.
//
// This more complex World shows:
// - Skybox
// - Internal maze (randomly drawn each time)
// - Enemy actively chases agent
// - 2D world (clone this and set show3d = false)
// - User keyboard control (clone this and comment out Mind actions to see)
// =============================================================================================


// =============================================================================================
// Scoring:
// Bad steps = steps where enemy is within one step of agent.
// Good steps = steps where enemy is further away.
// Score = good steps as percentage of all steps.
//
// There are situations where agent is trapped and cannot move.
// If this happens, you score zero.
//
// Scoring on the server side is done by taking average of n runs.
// Runs where you get trapped and score zero can seriously affect this score.
// =============================================================================================






// World must define these:

const	 	CLOCKTICK 	= 100;					// speed of run - move things every n milliseconds
const		MAXSTEPS 	= 1000;					// length of a run before final score


//---- global constants: -------------------------------------------------------

const gridsize = 20;						// number of squares along side of world

const NOBOXES =  Math.trunc ( (gridsize * gridsize) / 10 );
// density of maze - number of internal boxes
// (bug) use trunc or can get a non-integer

const squaresize = 100;					// size of square in pixels
const MAXPOS = gridsize * squaresize;		// length of one side in pixels

const SKYCOLOR 	= 0xddffdd;				// a number, not a string
const BLANKCOLOR 	= SKYCOLOR ;			// make objects this color until texture arrives (from asynchronous file read)




const show3d = true;						// Switch between 3d and 2d view (both using Three.js)

const startRadiusConst	 	= MAXPOS * 0.8 ;		// distance from centre to start the camera at
const skyboxConst			= MAXPOS * 3 ;		// where to put skybox
const maxRadiusConst 		= MAXPOS * 10  ;		// maximum distance from camera we will render things





//--- Mind can pick one of these actions -----------------

const ACTION_LEFT 		= 0;
const ACTION_RIGHT 		= 1;
const ACTION_UP 			= 2;
const ACTION_DOWN 		= 3;
const ACTION_STAYSTILL 		= 4;

// in initial view, (smaller-larger) on i axis is aligned with (left-right)
// in initial view, (smaller-larger) on j axis is aligned with (away from you - towards you)



// contents of a grid square

const GRID_BLANK 	= 0;
const GRID_WALL 	= 1;
const GRID_MAZE 	= 2;







// --- some useful random functions  -------------------------------------------


function randomfloatAtoB ( A, B )
{
    return ( A + ( Math.random() * (B-A) ) );
}

function randomintAtoB ( A, B )
{
    return  ( Math.round ( randomfloatAtoB ( A, B ) ) );
}

function randomBoolean()
{
    if ( Math.random() < 0.5 ) { return false; }
    else { return true; }
}







//---- start of World class -------------------------------------------------------

function World() {


// most of World can be private
// regular "var" syntax means private variables:


    var BOXHEIGHT;		// 3d or 2d box height


    var GRID 	= new Array(gridsize);			// can query GRID about whether squares are occupied, will in fact be initialised as a 2D array
    var WALLS 	= new Array ( 4 * gridsize );		// need to keep handles to wall and maze objects so can find them later to paint them
    var MAZE 	= new Array ( NOBOXES );
    var theagent, theenemy;


// enemy and agent position on squares
    var ei, ej, ai, aj;

    var badsteps;
    var goodsteps;
    var  step;

    var self = this;						// needed for private fn to call public fn - see below




// regular "function" syntax means private functions:


    function initGrid()
    {
        for (var i = 0; i < gridsize ; i++)
        {
            GRID[i] = new Array(gridsize);		// each element is an array

            for (var j = 0; j < gridsize ; j++)
            {
                GRID[i][j] = GRID_BLANK ;
            }
        }
    }

    function occupied ( i, j )		// is this square occupied
    {
        if ( ( ei == i ) && ( ej == j ) ) return true;		// variable objects
        if ( ( ai == i ) && ( aj == j ) ) return true;

        if ( GRID[i][j] == GRID_WALL ) return true;		// fixed objects
        if ( GRID[i][j] == GRID_MAZE ) return true;

        return false;
    }


// logically, coordinates are: y=0, x and z all positive (no negative)
// logically my dimensions are all positive 0 to MAXPOS
// to centre everything on origin, subtract (MAXPOS/2) from all dimensions

    function translate ( x )
    {
        return ( x - ( MAXPOS/2 ) );
    }





//--- skybox ----------------------------------------------------------------------------------------------


    function initSkybox()
    {

// x,y,z positive and negative faces have to be in certain order in the array

// mountain skybox, credit:
// http://stemkoski.github.io/Three.js/Skybox.html

        var materialArray = [
            ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/dawnmountain-xpos.png" ), side: THREE.BackSide } ) ),
            ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/dawnmountain-xneg.png" ), side: THREE.BackSide } ) ),
            ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/dawnmountain-ypos.png" ), side: THREE.BackSide } ) ),
            ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/dawnmountain-yneg.png" ), side: THREE.BackSide } ) ),
            ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/dawnmountain-zpos.png" ), side: THREE.BackSide } ) ),
            ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/dawnmountain-zneg.png" ), side: THREE.BackSide } ) )
        ];

        var skyGeometry = new THREE.CubeGeometry ( skyboxConst, skyboxConst, skyboxConst );
        var skyMaterial = new THREE.MeshFaceMaterial ( materialArray );
        var theskybox = new THREE.Mesh ( skyGeometry, skyMaterial );
        threeworld.scene.add( theskybox );						// We are inside a giant cube
    }


// This does the file read the old way using loadTexture.
// (todo) Change to asynchronous TextureLoader. A bit complex:
// Make blank skybox. Start 6 asynch file loads to call 6 return functions.
// Each return function checks if all 6 loaded yet. Once all 6 loaded, paint the skybox.





    /*
     // --- alternative skyboxes: ------------------------------

     // space skybox, credit:
     // http://en.spaceengine.org/forum/21-514-1
     // x,y,z labelled differently

     var materialArray = [
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/sky_pos_z.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/sky_neg_z.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/sky_pos_y.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/sky_neg_y.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/sky_pos_x.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/sky_neg_x.jpg" ), side: THREE.BackSide } ) ),
     ];

     // urban photographic skyboxes, credit:
     // http://opengameart.org/content/urban-skyboxes

     var materialArray = [
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/posx.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/negx.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/posy.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/negy.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/posz.jpg" ), side: THREE.BackSide } ) ),
     ( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/humphrys/negz.jpg" ), side: THREE.BackSide } ) ),
     ];

     */






// --- asynchronous load textures from file ----------------------------------------
// credits:
// http://commons.wikimedia.org/wiki/File:Old_door_handles.jpg?uselang=en-gb
// https://commons.wikimedia.org/wiki/Category:Pac-Man_icons
// https://commons.wikimedia.org/wiki/Category:Skull_and_crossbone_icons
// http://en.wikipedia.org/wiki/File:Inscription_displaying_apices_(from_the_shrine_of_the_Augustales_at_Herculaneum).jpg

// loader return can call private function


    function loadTextures()
    {

        var loader1 = new THREE.TextureLoader();
        loader1.load ( '/uploads/humphrys/door.jpg',		function ( thetexture ) {
            thetexture.minFilter = THREE.LinearFilter;
            paintWalls ( new THREE.MeshBasicMaterial( { map: thetexture } ) );
        } );

        var loader2 = new THREE.TextureLoader();
        loader2.load ( '/uploads/humphrys/latin.jpg',		function ( thetexture ) {
            thetexture.minFilter = THREE.LinearFilter;
            paintMaze ( new THREE.MeshBasicMaterial( { map: thetexture } ) );
        } );

        var loader3 = new THREE.TextureLoader();
        loader3.load ( '/uploads/humphrys/pacman.jpg',	function ( thetexture ) {
            thetexture.minFilter = THREE.LinearFilter;
            theagent.material =  new THREE.MeshBasicMaterial( { map: thetexture } );
        } );

        var loader4 = new THREE.TextureLoader();
        loader4.load ( '/uploads/humphrys/ghost.3.png',	function ( thetexture ) {
            thetexture.minFilter = THREE.LinearFilter;
            theenemy.material =  new THREE.MeshBasicMaterial( { map: thetexture } );
        } );

    }





// --- add fixed objects ----------------------------------------


    function initLogicalWalls()		// set up logical walls in data structure, whether doing graphical run or not
    {
        for (var i = 0; i < gridsize ; i++)
            for (var j = 0; j < gridsize ; j++)
                if ( ( i==0 ) || ( i==gridsize-1 ) || ( j==0 ) || ( j==gridsize-1 ) )
                {
                    GRID[i][j] = GRID_WALL ;
                }
    }


    function initThreeWalls()		// graphical run only, set up blank boxes, painted later
    {
        var t = 0;
        for (var i = 0; i < gridsize ; i++)
            for (var j = 0; j < gridsize ; j++)
                if ( GRID[i][j] == GRID_WALL )
                {
                    var shape    = new THREE.BoxGeometry( squaresize, BOXHEIGHT, squaresize );
                    var thecube  = new THREE.Mesh( shape );
                    thecube.material.color.setHex( BLANKCOLOR  );

                    thecube.position.x = translate ( i * squaresize );   		// translate my simple (i,j) block-numbering coordinates to three.js (x,y,z) coordinates
                    thecube.position.z = translate ( j * squaresize );
                    thecube.position.y =  0;

                    threeworld.scene.add(thecube);
                    WALLS[t] = thecube;				// save it for later
                    t++;
                }
    }


    function paintWalls ( material )
    {
        for ( var i = 0; i < WALLS.length; i++ )
        {
            if ( WALLS[i] )  WALLS[i].material = material;
        }
    }





    function initLogicalMaze()
    {
        for ( var c=1 ; c <= NOBOXES ; c++ )
        {
            var i = randomintAtoB(1,gridsize-2);	// inner squares are 1 to gridsize-2
            var j = randomintAtoB(1,gridsize-2);
            GRID[i][j] = GRID_MAZE ;
        }
    }


    function initThreeMaze()
    {
        var t = 0;
        for (var i = 0; i < gridsize ; i++)
            for (var j = 0; j < gridsize ; j++)
                if ( GRID[i][j] == GRID_MAZE )
                {
                    var shape    = new THREE.BoxGeometry( squaresize, BOXHEIGHT, squaresize );
                    var thecube  = new THREE.Mesh( shape );
                    thecube.material.color.setHex( BLANKCOLOR  );

                    thecube.position.x = translate ( i * squaresize );
                    thecube.position.z = translate ( j * squaresize );
                    thecube.position.y =  0;

                    threeworld.scene.add(thecube);
                    MAZE[t] = thecube;		// save it for later
                    t++;
                }
    }


    function paintMaze ( material )
    {
        for ( var i = 0; i < MAZE.length; i++ )
        {
            if ( MAZE[i] )  MAZE[i].material = material;
        }
    }







// --- enemy functions -----------------------------------


    function drawEnemy()	// given ei, ej, draw it
    {
        var x = translate ( ei * squaresize );
        var z = translate ( ej * squaresize );
        var y =  0;

        theenemy.position.x = x;
        theenemy.position.y = y;
        theenemy.position.z = z;
        threeworld.scene.add(theenemy);

        threeworld.lookat.copy ( theenemy.position );		// if camera moving, look back at where the enemy is
    }


    function initLogicalEnemy()
    {
// start in random location:
        var i, j;
        do
        {
            i = randomintAtoB(1,gridsize-2);
            j = randomintAtoB(1,gridsize-2);
        }
        while ( occupied(i,j) );  	  // search for empty square

        ei = i;
        ej = j;
    }


    function initThreeEnemy()
    {
        var shape    = new THREE.BoxGeometry( squaresize, BOXHEIGHT, squaresize );
        theenemy = new THREE.Mesh( shape );
        theenemy.material.color.setHex( BLANKCOLOR  );
        drawEnemy();
    }


    function moveLogicalEnemy()
    {
// move towards agent
// put some randomness in so it won't get stuck with barriers

        var i, j;
        if ( ei < ai ) i = randomintAtoB(ei, ei+1);
        if ( ei == ai ) i = ei;
        if ( ei > ai ) i = randomintAtoB(ei-1, ei);

        if ( ej < aj ) j = randomintAtoB(ej, ej+1);
        if ( ej == aj ) j = ej;
        if ( ej > aj ) j = randomintAtoB(ej-1, ej);

        if ( ! occupied(i,j) )  	// if no obstacle then move, else just miss a turn
        {
            ei = i;
            ej = j;
        }
    }





// --- agent functions -----------------------------------


    function drawAgent()	// given ai, aj, draw it
    {
        var x = translate ( ai * squaresize );
        var z = translate ( aj * squaresize );
        var y =  0;

        theagent.position.x = x;
        theagent.position.y = y;
        theagent.position.z = z;
        threeworld.scene.add(theagent);

        threeworld.follow.copy ( theagent.position );		// follow vector = agent position (for camera following agent)
    }


    function initLogicalAgent()
    {
// start in random location:
        var i, j;
        do
        {
            i = randomintAtoB(1,gridsize-2);
            j = randomintAtoB(1,gridsize-2);
        }
        while ( occupied(i,j) );  	  // search for empty square

        ai = i;
        aj = j;
    }

    function initThreeAgent()
    {
        var shape    = new THREE.BoxGeometry( squaresize, BOXHEIGHT, squaresize );
        theagent = new THREE.Mesh( shape );
        theagent.material.color.setHex( BLANKCOLOR );
        drawAgent();
    }


    function moveLogicalAgent( a )			// this is called by the infrastructure that gets action a from the Mind
    {
        var i = ai;
        var j = aj;

        if ( a == ACTION_LEFT ) 	i--;
        else if ( a == ACTION_RIGHT ) 	i++;
        else if ( a == ACTION_UP ) 		j++;
        else if ( a == ACTION_DOWN ) 	j--;

        if ( ! occupied(i,j) )
        {
            ai = i;
            aj = j;
        }
    }



    function keyHandler(e)
// user control
// Note that this.takeAction(a) is constantly running at same time, redrawing the screen.
    {
        if (e.keyCode == 37)  moveLogicalAgent ( ACTION_LEFT 	);
        if (e.keyCode == 38)  moveLogicalAgent ( ACTION_DOWN  	);
        if (e.keyCode == 39)  moveLogicalAgent ( ACTION_RIGHT 	);
        if (e.keyCode == 40)  moveLogicalAgent ( ACTION_UP	);
    }





// --- score: -----------------------------------


    function badstep()			// is the enemy within one square of the agent
    {
        if ( ( Math.abs(ei - ai) < 2 ) && ( Math.abs(ej - aj) < 2 ) ) return true;
        else return false;
    }


    function agentBlocked()			// agent is blocked on all sides, run over
    {
        return ( 	occupied (ai-1,aj) 		&&
        occupied (ai+1,aj)		&&
        occupied (  ai,aj+1)		&&
        occupied (  ai,aj-1) 	);
    }


    function updateStatusBefore(a)
// this is called before anyone has moved on this step, agent has just proposed an action
// update status to show old state and proposed move
    {
        var x = self.getState();
        var status = " Step: <b> " + step + " </b> &nbsp; x = (" + x.toString() + ") &nbsp; a = (" + a + ") ";

        $("#user_span3").html( status );
    }


    function   updateStatusAfter()		// agent and enemy have moved, can calculate score
    {
        // new state after both have moved
        var y = self.getState();
        var status = " &nbsp; y = (" + y.toString() + ") <BR> ";
        $("#user_span4").html( status );

        var score = self.getScore();

        var status = "   Bad steps: " + badsteps +
            " &nbsp; Good steps: " + goodsteps +
            " &nbsp; Score: " + score.toFixed(2) + "% ";

        $("#user_span5").html( status );
    }






//--- public functions / interface / API ----------------------------------------------------------


    this.endCondition;			// If set to true, run will end.



    this.newRun = function()
    {

// (subtle bug) must reset variables like these inside newRun (in case do multiple runs)

        this.endCondition = false;
        badsteps = 0;
        goodsteps = 0;
        step = 0;


        // for all runs:

        initGrid();
        initLogicalWalls();
        initLogicalMaze();
        initLogicalAgent();
        initLogicalEnemy();

        // for graphical runs only:

        if ( THREE_RUN  )
        {
            if ( show3d )
            {
                BOXHEIGHT = squaresize;
                threeworld.init3d ( startRadiusConst, maxRadiusConst, SKYCOLOR  );
            }
            else
            {
                BOXHEIGHT = 1;
                threeworld.init2d ( startRadiusConst, maxRadiusConst, SKYCOLOR  );
            }

            initSkybox();


            // Set up objects first:

            initThreeWalls();
            initThreeMaze();
            initThreeAgent();
            initThreeEnemy();

            // Then paint them with textures - asynchronous load of textures from files.
            // The texture file loads return at some unknown future time in some unknown order.
            // Because of the unknown order, it is probably best to make objects first and later paint them, rather than have the objects made when the file reads return.
            // It is safe to paint objects in random order, but might not be safe to create objects in random order.

            loadTextures();

            document.onkeydown = keyHandler;
        }

    };




    this.getState = function()
    {
        var x = [ ai, aj, ei, ej ];
        return ( x );
    };



    this.takeAction = function ( a )
    {
        step++;

        if ( THREE_RUN  )
            updateStatusBefore(a);			// show status line before moves

        moveLogicalAgent(a);

        if ( ( step % 2 ) == 0 )		// slow the enemy down to every nth step
            moveLogicalEnemy();


        if ( badstep() )
            badsteps++;
        else
            goodsteps++;

        if ( THREE_RUN  )
        {
            drawAgent();
            drawEnemy();
            updateStatusAfter();			// show status line after moves
        }


        if ( agentBlocked() )			// if agent blocked in, run over
        {
            this.endCondition = true;
            goodsteps = 0;			// you score zero as far as database is concerned
        }

    };



    this.endRun = function()
    {
        if ( THREE_RUN  )
        {
            if ( this.endCondition )
                $("#user_span6").html( " &nbsp; <font color=red> <B> Agent trapped. Final score zero. </B> </font>   "  );
            else
                $("#user_span6").html( " &nbsp; <font color=red> <B> Run over. </B> </font>   "  );
        }
    };


    this.getScore = function()
    {
        return ( ( goodsteps / step ) * 100 );
    };


}

//---- end of World class -------------------------------------------------------
