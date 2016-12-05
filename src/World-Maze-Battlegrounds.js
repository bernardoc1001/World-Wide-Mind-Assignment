

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




// Demo of 3d models

// skeleton credit
// http://tf3dm.com/3d-model/skeleton-with-organs-91102.html

// Peter Parker credit
// http://tf3dm.com/download-page.php?url=spider-man-4998

// male credit
// https://threejs.org/examples/#webgl_loader_obj






const	 	CLOCKTICK 	= 150;				// speed of run - move things every n milliseconds
const		MAXSTEPS 	= 1000;				// length of a run before final score




//---- global constants: -------------------------------------------------------


const gridsize = 30;					// number of squares along side of world
const squaresize = 100;					// size of square in pixels
const MAXPOS = gridsize * squaresize;		// length of one side in pixels

const NOBOXES =  Math.trunc ( (gridsize * gridsize) / 15 );


const SKYCOLOR 	= 0xffffcc;				// a number, not a string
const BLANKCOLOR 	= SKYCOLOR ;			// make objects this color until texture arrives (from asynchronous file read)

const  LIGHTCOLOR 	= 0xffffff ;



const startRadiusConst	 	= MAXPOS * 0.8 ;		// distance from centre to start the camera at
const skyboxConst			= MAXPOS * 3 ;		// where to put skybox
const maxRadiusConst 			= MAXPOS * 5 ;		// maximum distance from camera we will render things




//--- Mind can pick one of these actions -----------------

const ACTION_LEFT 		= 0;
const ACTION_RIGHT 		= 1;
const ACTION_UP 			= 2;
const ACTION_DOWN 		= 3;
const ACTION_STAYSTILL 		= 4;




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


function randomPick ( a, b )
{
    if ( randomBoolean() )
        return a;
    else
        return b;
}






//---- start of World class -------------------------------------------------------

function World() {


// most of World can be private
// regular "var" syntax means private variables:


    var GRID 	= new Array(gridsize);			// can query GRID about whether squares are occupied, will in fact be initialised as a 2D array
    var WALLS 	= new Array ( 4 * gridsize );		// need to keep handle to each wall block object so can find it later to paint it
    var MAZE 	= new Array ( NOBOXES );
    var theagent, theenemy;

    var agentRotation = 0;
    var enemyRotation = 0;		  // with 3D models, current rotation away from default orientation


// enemy and agent position on squares
    var ei, ej, ai, aj;

    var badsteps;
    var goodsteps;
    var  step;

    var self = this;						// needed for private fn to call public fn - see below





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



    function translate ( x )
    {
        return ( x - ( MAXPOS/2 ) );
    }





// --- asynch load textures from file ----------------------------------------
// credits:
// http://commons.wikimedia.org/wiki/File:Old_door_handles.jpg?uselang=en-gb
// https://commons.wikimedia.org/wiki/Category:Pac-Man_icons
// https://commons.wikimedia.org/wiki/Category:Skull_and_crossbone_icons


    function loadTextures()
    {
        var manager = new THREE.LoadingManager();
        var loader = new THREE.OBJLoader( manager );

        loader.load( "/uploads/humphrys/skelet.obj", buildenemy );



// load simple OBJ
//	 loader.load( "/uploads/humphrys/male02.obj", buildagent );


// load OBJ plus MTL (plus TGA files)
        THREE.Loader.Handlers.add( /.tga$/i, new THREE.TGALoader() );
        var m = new THREE.MTLLoader();
        m.setTexturePath ( "/uploads/humphrys/" );
        m.setPath        ( "/uploads/humphrys/" );
        m.load( "Peter_Parker.mtl", function( materials ) {

            materials.preload();
            var o = new THREE.OBJLoader();
            o.setMaterials ( materials );
            o.setPath ( "/uploads/humphrys/" );
            o.load( "Peter_Parker.obj", function ( object ) {
                addparker ( object );
            } );
        } );




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

    }



    function buildenemy ( object )
    {
        object.scale.multiplyScalar ( 4 );    	  // make 3d object n times bigger
        object.traverse( paintEnemy );
        theenemy = object;
        threeworld.scene.add( theenemy );
    }

    function paintEnemy ( child )
    {
        if ( child instanceof THREE.Mesh )
        {
            child.material.map = THREE.ImageUtils.loadTexture( "/uploads/humphrys/ghost.3.png" );
        }
    }




    /*

     function buildagent ( object )
     {
     object.traverse( paintAgent );
     theagent = object;
     threeworld.scene.add( theagent );
     }

     function paintAgent ( child )
     {
     if ( child instanceof THREE.Mesh )
     {
     child.material.map = THREE.ImageUtils.loadTexture( "/uploads/humphrys/pacman.jpg" );
     }
     }

     */


    function addparker ( object )
    {
        object.scale.multiplyScalar ( 70 );
        theagent = object;
        threeworld.scene.add( theagent );
    }





    function initSkybox()
    {
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


        var skyGeometry = new THREE.CubeGeometry ( skyboxConst, skyboxConst, skyboxConst );
        var skyMaterial = new THREE.MeshFaceMaterial ( materialArray );
        var theskybox = new THREE.Mesh ( skyGeometry, skyMaterial );
        threeworld.scene.add( theskybox );						// We are inside a giant cube
    }






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
                    var shape    = new THREE.BoxGeometry( squaresize, squaresize, squaresize );
                    var thecube  = new THREE.Mesh( shape );
                    thecube.material.color.setHex( BLANKCOLOR  );

                    thecube.position.x = translate ( i * squaresize );   		// translate my simple (i,j) block-numbering coordinates to three.js (x,y,z) coordinates
                    thecube.position.z = translate ( j * squaresize );
                    thecube.position.y =  0;

                    threeworld.scene.add(thecube);
                    WALLS[t] = thecube;		// save it for later
                    t++;
                }
    }


    function paintWalls ( material )		// paint blank boxes
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
            var i = randomintAtoB(2,gridsize-3);	// inner squares are 1 to gridsize-2
            var j = randomintAtoB(2,gridsize-3);
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
                    var shape    = new THREE.BoxGeometry( squaresize, squaresize, squaresize );
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


    function drawEnemy()		// given ei, ej, draw it
    {
        if ( theenemy )
        {
            var x = translate ( ei * squaresize );
            var z = translate ( ej * squaresize );
            var y =   ( -1 * squaresize );

            theenemy.position.x = x;
            theenemy.position.y = y;
            theenemy.position.z = z;

            threeworld.lookat.copy ( theenemy.position );		// if camera moving, look back at where the enemy is
            threeworld.lookat.y = ( squaresize * 1.5 );     // point camera higher up
        }
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


    function igetAction()
    {
        if ( ei < ai ) 	return (   ACTION_RIGHT 	);
        if ( ei > ai ) 	return (   ACTION_LEFT 		);
        return ( ACTION_STAYSTILL );
    }

    function jgetAction()
    {
        if ( ej < aj ) 	return (   ACTION_UP  	);
        if ( ej > aj ) 	return (   ACTION_DOWN  );
        return ( ACTION_STAYSTILL );
    }

    function enemyGetAction()
    {
        return randomPick ( igetAction(), jgetAction() );
    }


    function moveLogicalEnemy()
    {
        var a = enemyGetAction();
        var i = ei;
        var j = ej;

        if ( a == ACTION_LEFT ) 	{ i--;    }
        else if ( a == ACTION_RIGHT ) 	{ i++;    }
        else if ( a == ACTION_UP ) 		{ j++;    }
        else if ( a == ACTION_DOWN ) 	{ j--;    }

        if ( ! occupied(i,j) )
        {
            if ( THREE_RUN  )
            {
                if ( a == ACTION_LEFT ) 	{  rotateEnemyTowards ( 3 * (Math.PI / 2) ); }
                else if ( a == ACTION_RIGHT ) 	{  rotateEnemyTowards ( 1 * (Math.PI / 2) ); }
                else if ( a == ACTION_UP ) 		{  rotateEnemyTowards ( 0 * (Math.PI / 2) ); }
                else if ( a == ACTION_DOWN ) 	{  rotateEnemyTowards ( 2 * (Math.PI / 2) ); }
            }
            ei = i;
            ej = j;
        }
    }






    const INTERIMROT = 10;		// number of interim rotations drawn when model turns round

// all rotations positive 0 to 2 PI



    /*

     function rotateEnemyTowards ( newRotation )
     // rotate enemy from current value of "enemyRotation" towards "newRotation" - with interim renders
     {
     if ( enemyRotation == newRotation ) return;

     // else
     var delta = ( Math.abs ( enemyRotation - newRotation ) ) / INTERIMROT;
     // console.log ( "rotate from " + enemyRotation + " to " + newRotation + " in steps " + delta );
     var x;

     for ( var i = 1; i <= INTERIMROT; i++ )
     {
     if ( enemyRotation < newRotation ) x = enemyRotation + (delta * i);
     else x = enemyRotation - (delta * i);
     theenemy.rotation.set ( 0, x, 0 );
     // console.log ( "interim " + x );

     threeworld.render();
     }

     // console.log ( "end "   );
     theenemy.rotation.set ( 0, newRotation, 0 );
     enemyRotation = newRotation;					// new value
     }

     */


// interim renders not working
// temporary solution - rotate half-way - will continue the rotation later

    function rotateEnemyTowards ( newRotation )
    {
        if ( enemyRotation == newRotation ) return;
        // else
        var x = ( enemyRotation + newRotation ) / 2;
        theenemy.rotation.set ( 0, x, 0 );
        enemyRotation = x;
    }





// --- agent functions -----------------------------------


    function drawAgent()	// given ai, aj, draw it
    {
        if ( theagent )
        {
            var x = translate ( ai * squaresize );
            var z = translate ( aj * squaresize );
            var y =   ( -1 * squaresize );

            theagent.position.x = x;
            theagent.position.y = y;
            theagent.position.z = z;

            threeworld.follow.copy ( theagent.position );		// follow vector = agent position (for camera following agent)
            threeworld.follow.y = ( squaresize * 1.5 );     // put camera higher up
        }
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



    function moveLogicalAgent( a )			// this is called by the infrastructure that gets action a from the Mind
    {
        var i = ai;
        var j = aj;


        if ( a == ACTION_LEFT ) 	{ i--;    }
        else if ( a == ACTION_RIGHT ) 	{ i++;    }
        else if ( a == ACTION_UP ) 	{ j++;    }
        else if ( a == ACTION_DOWN ) 	{ j--;    }

        if ( ! occupied(i,j) )
        {
            if ( THREE_RUN  )
            {
                // if going to actually move, then turn body towards move
                // rotate by some amount of radians from the normal position
                // in degrees: +0, +90, +180, +270

                if ( a == ACTION_LEFT ) 	{  rotateAgentTowards ( 3 * (Math.PI / 2) ); }
                else if ( a == ACTION_RIGHT ) 	{  rotateAgentTowards ( 1 * (Math.PI / 2) ); }
                else if ( a == ACTION_UP ) 		{  rotateAgentTowards ( 0 * (Math.PI / 2) ); }
                else if ( a == ACTION_DOWN ) 	{  rotateAgentTowards ( 2 * (Math.PI / 2) ); }
            }
            ai = i;
            aj = j;
        }
    }



    function rotateAgentTowards ( newRotation )
    {
        if ( agentRotation == newRotation ) return;
        // else
        var x = ( agentRotation + newRotation ) / 2;
        theagent.rotation.set ( 0, x, 0 );
        agentRotation = x;
    }







// --- score: -----------------------------------


    function badstep()			// is the enemy within one square of the agent
    {
        if ( ( Math.abs(ei - ai) < 2 ) && ( Math.abs(ej - aj) < 2 ) ) return true;
        else return false;
    }


    function   updateStatus()
    {
        //var score = self.getScore();
        //var status =  "   Step: " + step + " out of " + MAXSTEPS + ". Score: " + score;

        var status = "Test Print out"

        $("#user_span1").html( status );
    }






//--- public functions / interface / API ----------------------------------------------------------


// must have this public variable:

    this.endCondition;			// If set to true, run will end.




    this.newRun = function()
    {
        this.endCondition = false;
        badsteps = 0;
        goodsteps = 0;
        step = 0;


        // define logical data structure for the World, even if no graphical representation:

        initGrid();
        initLogicalWalls();
        initLogicalMaze();

        initLogicalAgent();
        initLogicalEnemy();


        if ( THREE_RUN  )
        {
            threeworld.init3d ( startRadiusConst, maxRadiusConst, SKYCOLOR  );


            // light
            var ambient = new THREE.AmbientLight();
            threeworld.scene.add( ambient );


            var thelight = new THREE.DirectionalLight ( LIGHTCOLOR, 3 );
            thelight.position.set ( startRadiusConst, startRadiusConst, startRadiusConst );
            threeworld.scene.add(thelight);


            /*
             // music
             var x = "<audio  id=theaudio  src=/uploads/humphrys/SuspenseStrings.mp3   autoplay loop> </audio>" ;
             $("#user_span2").html( x );

             // music credit
             // http://www.dl-sounds.com/royalty-free/suspense-strings/
             */


            initSkybox();
            //	initThreeWalls();
            initThreeMaze();

            loadTextures();			// will return sometime later, but can go ahead and render now
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
            updateStatus();
        }

    };



    this.endRun = function()
    {
    };


    this.getScore = function()
    {
        return goodsteps;
    };


}

//---- end of World class -------------------------------------------------------




