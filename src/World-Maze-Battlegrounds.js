/*
 README:
 Current Control Scheme
 Action:        Agent Controls:         Enemy Controls
 Move Up        up arrow                w
 Move Left      left arrow              a
 Move Down      down arrow              s
 Move Right     right arrow             d
 Attack         Insert key (num 0)      spacebar

 Current Pickup Legend:
 Portal             purple sphere
 Damage pickup      red octahedron
 health pickup      green dodecahedron

 Below are my origional plans for the project, I will update this section at the end of the project

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
 their opponent.  If they survive the run they get +100 points.  If they die
 they lose 50 points.
 There will be some maximum amount of turns to end the game if neither AI dies.

 Combat:
 -> When the AI is in range of their opponent there will be a dice roll to see if they hit or miss.
 -> weapons will have a lower damage value and an upper damage value.  On hit with will be a dice
 roll on the damage dealt within that range.

 */

/*
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
*/





// World must define these:

const	 	CLOCKTICK 	= 100;					// speed of run - move things every n milliseconds
const		MAXSTEPS 	= 1000;					// length of a run before final score


//---- global constants: -------------------------------------------------------

const GRIDSIZE = 23;	// number of squares along side of world. THIS IS A FIXED SIZE OF 23 FOR THIS MANUALLY MADE maze!!!

const squaresize = 100;					// size of square in pixels
const MAXPOS = GRIDSIZE * squaresize;		// length of one side in pixels

const SKYCOLOR 	= 0xddffdd;				// a number, not a string
const BLANKCOLOR 	= SKYCOLOR ;			// make objects this color until texture arrives (from asynchronous file read)




const show3d = false;						// Switch between 3d and 2d view (both using Three.js)

const startRadiusConst	 	= MAXPOS * 0.8 ;		// distance from centre to start the camera at
const skyboxConst			= MAXPOS * 3 ;		// where to put skybox
const maxRadiusConst 		= MAXPOS * 10  ;		// maximum distance from camera we will render things





//--- Mind can pick one of these actions -----------------

const ACTION_LEFT 		= 0;
const ACTION_RIGHT 		= 1;
const ACTION_UP 		= 2;
const ACTION_DOWN 		= 3;
const ACTION_STAYSTILL 	= 4;
const ACTION_ATTACK     = 5;

// in initial view, (smaller-larger) on i axis is aligned with (left-right)
// in initial view, (smaller-larger) on j axis is aligned with (away from you - towards you)



// contents of a grid square
const GRID_BLANK = 0;
const GRID_WALL = 1;
const GRID_PORTAL = 2;
const GRID_DAMAGE_PICKUP = 3;
const GRID_HEALTH_PICKUP = 4;
const GRID_OPPONENT_OCCUPIED = 5; //this is only set in an AI's lineOfSight 2d array

//pickup modifiers
const DAMAGE_MODIFIER = 5;
const HEALTH_MODIFIER = 25;


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


    var GRID = new Array(GRIDSIZE);			// can query GRID about whether squares are occupied, will in fact be initialised as a 2D array
    var mazeObjects = new Array (GRIDSIZE); //this holds every THREE.js object in the maze (except for the AI), will in fact be initialised as a 2D array

    var aiHasDied = false; //When this is set true, do one final score calculation, then set this.endCondition to true.
    var agentMap = { //the agent AIMap
        'name': 'My name is Agent', //debug purposes
        'i': null,
        'j': null,
        'oldI':null,
        'oldJ':null,
        'attackDamage': 1,
        'attackRange': 1,
        'opponentInRange': false,
        'totalDamageDealt': 0,
        'health': 100,
        'mesh': null,
        'score': 0,
        'lineOfSight': new Array(GRIDSIZE),
        'trapped':false
    };

    var enemyMap = { //the enemy AIMap
        'name': 'My name is Enemy', //debug purposes
        'i': null,
        'j': null,
        'oldI':null,
        'oldJ':null,
        'attackDamage': 1,
        'attackRange': 1,
        'opponentInRange': false,
        'totalDamageDealt': 0,
        'health': 100,
        'mesh': null,
        'score': 0,
        'lineOfSight': new Array(GRIDSIZE),
        'trapped':false
    };

    var badsteps;
    var goodsteps;
    var  step;


    var self = this;						// needed for private fn to call public fn - see below




// regular "function" syntax means private functions:


    function initGrid()
    {
        for (var i = 0; i < GRIDSIZE ; i++)
        {
            GRID[i] = new Array(GRIDSIZE);		// each element is an array
            mazeObjects[i] = new Array(GRIDSIZE); //also make the array that tracks maze objects 2d
            agentMap['lineOfSight'][i] = new Array(GRIDSIZE);  //also make the agent's lineOfSight array 2d
            enemyMap['lineOfSight'][i] = new Array(GRIDSIZE);  //also make the enemy's lineOfSight array 2d

            for (var j = 0; j < GRIDSIZE ; j++)
            {
                GRID[i][j] = GRID_BLANK ;
            }
        }
    }

    function occupied ( i, j )		// is this square occupied
    {
        if ( ( enemyMap['i'] == i ) && ( enemyMap['j'] == j ) ) return true;		// variable objects
        if ( ( agentMap['i'] == i ) && ( agentMap['j'] == j ) ) return true;

        if ( GRID[i][j] == GRID_WALL ) return true;		// fixed objects and pickups

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
// todo Change to asynchronous TextureLoader. A bit complex:
// Make blank skybox. Start 6 asynch file loads to call 6 return functions.
// Each return function checks if all 6 loaded yet. Once all 6 loaded, paint the skybox.


// --- asynchronous load textures from file ----------------------------------------
// credits:
// http://commons.wikimedia.org/wiki/File:Old_door_handles.jpg?uselang=en-gb
// https://commons.wikimedia.org/wiki/Category:Pac-Man_icons
// https://commons.wikimedia.org/wiki/Category:Skull_and_crossbone_icons
// http://en.wikipedia.org/wiki/File:Inscription_displaying_apices_(from_the_shrine_of_the_Augustales_at_Herculaneum).jpg

// loader return can call private function


    function loadTextures()
    {
        /*
        var loader2 = new THREE.TextureLoader();
        loader2.load ( '/uploads/humphrys/latin.jpg',		function ( thetexture ) {
            thetexture.minFilter = THREE.LinearFilter;
            paintMaze ( new THREE.MeshBasicMaterial( { map: thetexture } ) );
        } );
        */
        var loader3 = new THREE.TextureLoader();
        loader3.load ( '/uploads/humphrys/pacman.jpg',	function ( thetexture ) {
            thetexture.minFilter = THREE.LinearFilter;
            agentMap['mesh'].material =  new THREE.MeshBasicMaterial( { map: thetexture } );
        } );

        var loader4 = new THREE.TextureLoader();
        loader4.load ( '/uploads/humphrys/ghost.3.png',	function ( thetexture ) {
            thetexture.minFilter = THREE.LinearFilter;
            enemyMap['mesh'].material =  new THREE.MeshBasicMaterial( { map: thetexture } );
        } );

    }





// --- add fixed objects ----------------------------------------

    //This function will create the entire logical maze, including all pickups and portals
    function initLogicalMaze()
    {
        //This function is hard-coded for a fixed maze of length 23 across and down.
        // I will manually make rows 0-11.  Rows 12-22 will be a mirror image of rows 0-10.

        // Note by default each square is already a GRID_BLANK due to initGrid()

        //row 0
        for(var i = 0; i < GRIDSIZE; i++)
        {
            GRID[i][0] = GRID_WALL;
        }

        //row 1
        GRID[0][1] = GRID_WALL;
        GRID[1][1] = GRID_PORTAL;
        GRID[4][1] = GRID_WALL;
        GRID[10][1] = GRID_WALL;
        GRID[12][1] = GRID_WALL;
        GRID[21][1] = GRID_PORTAL;
        GRID[22][1] = GRID_WALL;

        //row 2
        GRID[0][2] = GRID_WALL;
        GRID[2][2] = GRID_WALL;

        for(i = 6; i <= 22; i += 2)
        {
            GRID[i][2] = GRID_WALL;
        }

        //row 3
        GRID[0][3] = GRID_WALL;
        GRID[2][3] = GRID_WALL;
        GRID[3][3] = GRID_WALL;
        GRID[5][3] = GRID_WALL;
        GRID[6][3] = GRID_WALL;
        GRID[8][3] = GRID_WALL;
        GRID[9][3] = GRID_WALL;
        for(i = 10; i <= 22; i += 2)
        {
            GRID[i][3] = GRID_WALL;
        }

        //row 4
        GRID[0][4] = GRID_WALL;
        GRID[5][4] = GRID_WALL;
        GRID[8][4] = GRID_WALL;
        GRID[22][4] = GRID_WALL;

        //row 5
        GRID[0][5] = GRID_WALL;
        GRID[1][5] = GRID_WALL;
        GRID[3][5] = GRID_WALL;
        GRID[5][5] = GRID_WALL;
        GRID[7][5] = GRID_WALL;
        GRID[8][5] = GRID_WALL;
        for(i = 10; i <= 16; i++)
        {
            GRID[i][5] = GRID_WALL;
        }
        GRID[17][5] = GRID_HEALTH_PICKUP;
        GRID[18][5] = GRID_WALL;
        GRID[19][5] = GRID_WALL;
        GRID[20][5] = GRID_WALL;
        GRID[22][5] = GRID_WALL;

        //row 6
        GRID[0][6] = GRID_WALL;
        GRID[3][6] = GRID_WALL;
        GRID[5][6] = GRID_WALL;
        GRID[10][6] = GRID_WALL;
        GRID[14][6] = GRID_WALL;
        GRID[16][6] = GRID_WALL;
        GRID[17][6] = GRID_WALL;
        GRID[18][6] = GRID_WALL;
        GRID[22][6] = GRID_WALL;

        //row 7
        GRID[0][7] = GRID_WALL;
        GRID[2][7] = GRID_WALL;
        GRID[3][7] = GRID_WALL;
        GRID[7][7] = GRID_WALL;
        GRID[9][7] = GRID_WALL;
        GRID[10][7] = GRID_WALL;
        GRID[12][7] = GRID_WALL;
        GRID[14][7] = GRID_WALL;
        GRID[18][7] = GRID_WALL;
        GRID[19][7] = GRID_DAMAGE_PICKUP;
        GRID[20][7] = GRID_WALL;
        GRID[22][7] = GRID_WALL;

        //row 8
        GRID[0][8] = GRID_WALL;
        GRID[2][8] = GRID_DAMAGE_PICKUP;
        GRID[3][8] = GRID_WALL;
        GRID[4][8] = GRID_WALL;
        GRID[5][8] = GRID_WALL;
        GRID[7][8] = GRID_WALL;
        GRID[12][8] = GRID_WALL;
        GRID[14][8] = GRID_WALL;
        GRID[16][8] = GRID_WALL;
        GRID[18][8] = GRID_WALL;
        GRID[19][8] = GRID_WALL;
        GRID[20][8] = GRID_WALL;
        GRID[22][8] = GRID_WALL;

        //row 9
        GRID[0][9] = GRID_WALL;
        GRID[2][9] = GRID_WALL;
        GRID[4][9] = GRID_HEALTH_PICKUP;
        GRID[5][9] = GRID_WALL;
        for(i = 7; i <= 10; i++)
        {
            GRID[i][9] = GRID_WALL;
        }
        GRID[12][9] = GRID_WALL;
        GRID[16][9] = GRID_WALL;
        GRID[22][9] = GRID_WALL;

        //row 10
        GRID[0][10] = GRID_WALL;
        GRID[4][10] = GRID_WALL;
        GRID[8][10] = GRID_WALL;
        GRID[10][10] = GRID_WALL;
        GRID[12][10] = GRID_WALL;
        GRID[13][10] = GRID_WALL;
        GRID[15][10] = GRID_WALL;
        GRID[17][10] = GRID_WALL;
        GRID[18][10] = GRID_WALL;
        GRID[20][10] = GRID_WALL;
        GRID[21][10] = GRID_WALL;
        GRID[22][10] = GRID_WALL;

        //row 11. This is the middle row (it will not be mirrored, only 0-10 will be mirrored)
        for(var i = 0; i <= 3; i++)
        {
            GRID[i][11] = GRID_WALL;
        }
        GRID[4][11] = GRID_PORTAL;
        GRID[6][11] = GRID_WALL;
        GRID[22][11] = GRID_WALL;

        //mirror the remaining rows.
        var jOld = 10;
        for(var jNew = 12; jNew < GRIDSIZE; jNew++)
        {
            for(i = 0; i < GRIDSIZE; i++)
            {
                GRID[i][jNew] = GRID[i][jOld];
            }
            jOld--;
        }

    }


    function initThreeMaze()
    {
        var geometry;
        var material;
        var theMesh;
        for (var i = 0; i < GRIDSIZE ; i++) {
            for (var j = 0; j < GRIDSIZE; j++) {
                if (GRID[i][j] == GRID_WALL) {
                    geometry = new THREE.BoxGeometry(squaresize, BOXHEIGHT, squaresize);
                    material = new THREE.MeshBasicMaterial({color: 0x008000})
                    theMesh = new THREE.Mesh(geometry, material);
                    // theMesh.material.color.setHex(BLANKCOLOR);

                    theMesh.position.x = translate(i * squaresize);
                    theMesh.position.z = translate(j * squaresize);
                    theMesh.position.y = 0;

                    threeworld.scene.add(theMesh);
                    mazeObjects[i][j] = theMesh;		// save it for later

                }

                else if (GRID[i][j] == GRID_PORTAL) {
                    geometry = new THREE.SphereGeometry(50, 32, 32);
                    material = new THREE.MeshBasicMaterial({color: 0x4d0099})
                    theMesh = new THREE.Mesh(geometry, material);
                    //theMesh.material.color.setHex(BLANKCOLOR);

                    theMesh.position.x = translate(i * squaresize);
                    theMesh.position.z = translate(j * squaresize);
                    theMesh.position.y = 0;

                    threeworld.scene.add(theMesh);
                    mazeObjects[i][j] = theMesh;		// save it for later
                }

                else if (GRID[i][j] == GRID_DAMAGE_PICKUP) {
                    geometry = new THREE.OctahedronGeometry(50, 0);
                    material = new THREE.MeshBasicMaterial({color: 0x990000})
                    theMesh = new THREE.Mesh(geometry, material);
                    //theMesh.material.color.setHex(BLANKCOLOR);

                    theMesh.position.x = translate(i * squaresize);
                    theMesh.position.z = translate(j * squaresize);
                    theMesh.position.y = 0;

                    threeworld.scene.add(theMesh);
                    mazeObjects[i][j] = theMesh;		// save it for later

                }

                else if (GRID[i][j] == GRID_HEALTH_PICKUP) {
                    geometry = new THREE.DodecahedronGeometry(50, 0);
                    material = new THREE.MeshBasicMaterial({color: 0x00ff00})
                    theMesh = new THREE.Mesh(geometry, material);
                    //theMesh.material.color.setHex(BLANKCOLOR);

                    theMesh.position.x = translate(i * squaresize);
                    theMesh.position.z = translate(j * squaresize);
                    theMesh.position.y = 0;

                    threeworld.scene.add(theMesh);
                    mazeObjects[i][j] = theMesh;		// save it for later
                }
            }
        }
    }


// AI interactions with game world (i.e pickups and attacks)



    function teleport(AIMap)
    {
        var i, j;
        do
        {
            i = randomintAtoB(1,GRIDSIZE-2);
            j = randomintAtoB(1,GRIDSIZE-2);
        }
        while ( occupied(i,j) && GRID[i][j] != GRID_BLANK);  	  // search for empty square

        //set old i and j to null
        AIMap['oldI'] = null;
        AIMap['oldJ'] = null;

        //set new position
        AIMap['i'] = i;
        AIMap['j'] = j;

    }

    function addModifier(AIMap, modType)
    {
        if(modType == GRID_HEALTH_PICKUP)
        {
            AIMap['health'] += HEALTH_MODIFIER;
        }
        else if (modType == GRID_DAMAGE_PICKUP)
        {
            AIMap['attackDamage'] += DAMAGE_MODIFIER;
        }
    }

    function removePickUp(i,j)
    {
        GRID[i][j] = GRID_BLANK;
        threeworld.scene.remove(mazeObjects[i][j]);
    }

    function useBlockPickup(AIMap)
    {
        //need to keep track of initial i and j separately from the AI's i and j
        var i = AIMap['i'];
        var j = AIMap['j'];
        if(i == null || j == null)
        {
            //do nothing, the ai is dead ,i.e position is null
        }
        else {
            var blockType = GRID[i][j];
            if (blockType == GRID_BLANK)
            {
                //Do nothing, the location contains no pickup
            }
            else {
                if (blockType == GRID_PORTAL)
                {
                    teleport(AIMap);
                    removePickUp(i, j);
                }
                else if (blockType == GRID_HEALTH_PICKUP || blockType == GRID_DAMAGE_PICKUP)
                {
                    addModifier(AIMap, blockType);
                    removePickUp(i, j);
                }
            }
        }
    }


    function targetInRange(attackerAIMap, targetAIMap)
    {
        //cant use distance formula, just judge range on either up and down range or left and right range, no diagonals
        if(attackerAIMap['i'] == targetAIMap['i'])
        {
            if(Math.abs(attackerAIMap['j'] - targetAIMap['j']) <= attackerAIMap['attackRange'])
                return true;
            else
                return false;
        }
        if(attackerAIMap['j'] == targetAIMap['j'])
        {
            if(Math.abs(attackerAIMap['i'] - targetAIMap['i']) <= attackerAIMap['attackRange'])
                return true;
            else
                return false;
        }
        return false;
    }

    function attackTarget(attackerAIMap, targetAIMap)
    {
        if(targetInRange(attackerAIMap, targetAIMap))
        {
            //todo introduce dice rolls into attack damage
            var damageDealt;
            if(!aiHasDied) //Stop bug where a dead ai can still attack between them dieing and the run ending
            {
                damageDealt = attackerAIMap['attackDamage'];
            }
            else
            {
                damageDealt = 0;
            }


            if(targetAIMap['health'] <= damageDealt)
            {
                attackerAIMap['totalDamageDealt'] += targetAIMap['health']; // Don't let the AI deal damage > the targets health
                targetAIMap['health'] = 0; // don't allow negative health
                aiHasDied = true;   //target is dead
                removeDeadAI(targetAIMap);
                endRunProcedure(); //target has died, begin procedure to end the run
            }
            else
            {
                attackerAIMap['totalDamageDealt'] += damageDealt; //damage dealt is saved for scoring purposes
                targetAIMap['health'] -= damageDealt;
            }
        }
    }

    function moveLogicalAI(AIMap, a)
    {
        var i = AIMap['i'];
        var j = AIMap['j'];

        if ( a == ACTION_LEFT ) 	i--;
        else if ( a == ACTION_RIGHT ) 	i++;
        else if ( a == ACTION_UP ) 		j--;
        else if ( a == ACTION_DOWN ) 	j++;
        else if (a == ACTION_STAYSTILL) {/* Do nothing*/}

        if ( ! occupied(i,j) )  	// if no obstacle then move, else just miss a turn
        {
            console.log('no obstacle');
            //Update old i and j first
            AIMap['oldI'] = AIMap['i'];
            AIMap['oldJ'] = AIMap['j'];

            //move the ai the the new position
            AIMap['i'] = i;
            AIMap['j'] = j;
        }
        else
        {console.log('obstacle in my way');}
        useBlockPickup(AIMap);
    }

    function takeTurnLogicalAI( thisAIMap, otherAIMap, a )
    {
        if(a == ACTION_ATTACK)
        {

            attackTarget(thisAIMap,otherAIMap);
        }

        else
        {
            moveLogicalAI(thisAIMap,a);
        }


        totalLineOfSight(thisAIMap); //get new line of sight at the end of each turn (used in AI minds)
        aiTrapped(thisAIMap); //check if the ai is trapped at the end of each turn (used in AI minds)
        thisAIMap['opponentInRange'] = targetInRange(thisAIMap, otherAIMap); //set if target is in range at the end of each turn (used in AI minds)

    }

    function removeDeadAI(AIMap)
    {
        threeworld.scene.remove(AIMap['mesh']);
        AIMap['i'] = null;
        AIMap['j'] = null;
    }

    function endRunProcedure()
    {
        updateStatus();
        self.endCondition = true;
    }

// --- enemy functions -----------------------------------


    function drawEnemy()	// given i and j, draw it
    {
        var x = translate ( enemyMap['i'] * squaresize );
        var z = translate ( enemyMap['j'] * squaresize );
        var y =  0;

        enemyMap['mesh'].position.x = x;
        enemyMap['mesh'].position.y = y;
        enemyMap['mesh'].position.z = z;
        threeworld.scene.add(enemyMap['mesh']);

        threeworld.lookat.copy ( enemyMap['mesh'].position );		// if camera moving, look back at where the enemy is
    }


    function initLogicalEnemy()
    {
        // start in fixed location:
        enemyMap['i'] = 11;
        enemyMap['j'] = 21;

        //get initial line of sight
        totalLineOfSight(enemyMap);
    }


    function initThreeEnemy()
    {
        var shape    = new THREE.BoxGeometry( squaresize, BOXHEIGHT, squaresize );
        enemyMap['mesh'] = new THREE.Mesh( shape );
        enemyMap['mesh'].material.color.setHex( BLANKCOLOR  );
        drawEnemy();
    }


// --- agent functions -----------------------------------


    function drawAgent()	// given ai, aj, draw it
    {
        var x = translate ( agentMap['i'] * squaresize );
        var z = translate ( agentMap['j'] * squaresize );
        var y =  0;

        agentMap['mesh'].position.x = x;
        agentMap['mesh'].position.y = y;
        agentMap['mesh'].position.z = z;
        threeworld.scene.add(agentMap['mesh']);

        threeworld.follow.copy ( agentMap['mesh'].position );		// follow vector = agent position (for camera following agent)
    }

    function initLogicalAgent()
    {
    // start in fixed location:
        agentMap['i'] = 11;
        agentMap['j'] = 1;

        //get initial line of sight
        totalLineOfSight(agentMap);
    }

    function initThreeAgent()
    {
        var shape    = new THREE.BoxGeometry( squaresize, BOXHEIGHT, squaresize );
        agentMap['mesh'] = new THREE.Mesh( shape );
        agentMap['mesh'].material.color.setHex( BLANKCOLOR );
        drawAgent();
    }




    function keyHandler(e)
// user control
// Note that this.takeAction(a) is constantly running at same time, redrawing the screen.
    {
        //agent key handling, movement is arrow keys
        if (e.keyCode == 38)  moveLogicalAI (agentMap, ACTION_UP);    //up arrow key
        if (e.keyCode == 37)  moveLogicalAI (agentMap, ACTION_LEFT);  //left arrow key
        if (e.keyCode == 40)  moveLogicalAI (agentMap, ACTION_DOWN);  //down arrow key
        if (e.keyCode == 39)  moveLogicalAI (agentMap, ACTION_RIGHT); //right arrow key
        if (e.keyCode == 45)  attackTarget  (agentMap, enemyMap);     //insert key


        //enemy key handling, movement is WASD keys
        if (e.keyCode == 87)  moveLogicalAI (enemyMap, ACTION_UP);    //w key
        if (e.keyCode == 65)  moveLogicalAI (enemyMap, ACTION_LEFT);  //a key
        if (e.keyCode == 83)  moveLogicalAI (enemyMap, ACTION_DOWN);  //s key
        if (e.keyCode == 68)  moveLogicalAI (enemyMap, ACTION_RIGHT); //d key

        if (e.keyCode == 32)  attackTarget  (enemyMap, agentMap);     //space
    }





// --- score: -----------------------------------

    function calculateSingleScore(AIMap)
    {
        var currentScore = AIMap['health'] + AIMap['totalDamageDealt'];
        if(aiHasDied)
        {
            if(AIMap['health'] > 0)
            {
                AIMap['score'] = currentScore + 100;
            }
            else
            {
                AIMap['score'] = currentScore - 50;
            }
        }
        else
        {
            AIMap['score'] = currentScore;
        }
    }

    function calculateScores()
    {
        calculateSingleScore(agentMap);
        calculateSingleScore(enemyMap);
    }

    function aiTrapped(AIMap)			// agent is blocked on all sides, run over
    {
        if( occupied (AIMap['i']-1,AIMap['j']) && occupied (AIMap['i']+1,AIMap['j']) && occupied (AIMap['i'],AIMap['j']+1) && occupied (AIMap['i'],AIMap['j']-1))
        {
            AIMap['trapped'] = true;
        }
        else
        {
            AIMap['trapped'] = false;
        }
    }


    function   updateStatus()
    {
        calculateScores();
        //aligning text without css or bootstrap has made me a broken man, forgive me for what I have done.
        var scores = 'Agent Score: &nbsp;' + agentMap['score'] + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Enemy Score: ' + '&nbsp;' + enemyMap['score'];

        var aStatus = 'Agent&nbsp;&nbsp;Health:&nbsp;&nbsp;' +  agentMap['health'] + '&nbsp; &nbsp;&nbsp; Agent Attack Damage: &nbsp;' + agentMap['attackDamage'];
        var eStatus = 'Enemy&nbsp;Health:&nbsp;' +  enemyMap['health'] + '&nbsp; &nbsp; Enemy Attack Damage: &nbsp;' + enemyMap['attackDamage'];

        var aControls = 'Agent Controls:  Move with arrow keys, Attack with insert key (NUM 0)';
        var eControls = 'Enemy Controls:  Move with WASD, Attack with spacebar ';

        $("#user_span3").html(aStatus  + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + aControls + '<br>' );


        $("#user_span4").html(eStatus  + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + eControls + '<br>'  );


        var stepsRemaining = MAXSTEPS - step;
        $("#user_span5").html(scores + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Steps Remaining: ' + stepsRemaining );

    }


//--- state gathering for the AIs -----------------------------------------------------------------



    function singleDirectionLineOfSight(AIMap, iModifier, jModifier)
    {
        //only 1 modifier should be != 0 in order to look either straight up, down, left or right, and this modifier
        //should only be either 1 or -1 to avoid skipping squares

        //a line of sight are the straight blocks in a direction plus 1 block on either side of this line

        var curI = AIMap['i'] + iModifier; //add the modifier first to look at square this AI is not occupying
        var curJ = AIMap['j'] + jModifier; //add the modifier first to look at square this AI is not occupying

        while(!occupied(curI,curJ)) //note an assumption is made here that there is no gaps in the outter wall of the maze here
        {
            AIMap['lineOfSight'][curI][curJ] = GRID[curI][curJ];

            if(iModifier != 0)//grab above and below blocks aswell
            {
                if(occupied(curI, curJ + 1) && GRID[curI][curJ + 1] != GRID_WALL)//check if the square is occupied by the opponent or a wall
                {
                    AIMap['lineOfSight'][curI][curJ + 1] = GRID_OPPONENT_OCCUPIED; //this spot is blocked by the opponent
                }
                else
                {
                    AIMap['lineOfSight'][curI][curJ + 1] = GRID[curI][curJ + 1];
                }
                if(occupied(curI, curJ - 1) && GRID[curI][curJ - 1] != GRID_WALL)//check if the square is occupied by the opponent or a wall
                {
                    AIMap['lineOfSight'][curI][curJ - 1] = GRID_OPPONENT_OCCUPIED; //this spot is blocked by the opponent
                }
                else
                {
                    AIMap['lineOfSight'][curI][curJ - 1] = GRID[curI][curJ - 1];
                }
            }
            else //grab blocks to the left and right aswell
            {
                if(occupied(curI + 1, curJ) && GRID[curI + 1][curJ] != GRID_WALL)//check if the square is occupied by the opponent or a wall
                {
                    AIMap['lineOfSight'][curI + 1][curJ] = GRID_OPPONENT_OCCUPIED; //this spot is blocked by the opponent
                }
                else
                {
                    AIMap['lineOfSight'][curI + 1][curJ] = GRID[curI + 1][curJ];
                }

                if(occupied(curI - 1, curJ) && GRID[curI - 1][curJ] != GRID_WALL)//check if the square is occupied by the opponent or a wall
                {
                    AIMap['lineOfSight'][curI - 1][curJ] = GRID_OPPONENT_OCCUPIED; //this spot is blocked by the opponent
                }
                else
                {
                    AIMap['lineOfSight'][curI - 1][curJ] = GRID[curI - 1][curJ];
                }

            }

            curI += iModifier;
            curJ += jModifier;
        }

        //also add the square (and its neighbours) that is occupied to the line of sight
        if(occupied(curI, curJ) && GRID[curI][curJ] != GRID_WALL)//check if the square is occupied by the opponent or a wall
        {

            AIMap['lineOfSight'][curI][curJ] = GRID_OPPONENT_OCCUPIED; //this spot is blocked by the opponent
        }
        else
        {   //the sport is blocked by a wall, not the opponent
            AIMap['lineOfSight'][curI][curJ] = GRID[curI][curJ];
        }
        //next grab the neighbouring two squares
        if(iModifier != 0)//grab above and below blocks aswell
        {
            AIMap['lineOfSight'][curI][curJ + 1] = GRID[curI][curJ + 1];
            AIMap['lineOfSight'][curI][curJ - 1] = GRID[curI][curJ - 1];
        }
        else //grab blocks to the left and right aswell
        {
            AIMap['lineOfSight'][curI + 1][curJ] = GRID[curI + 1][curJ];
            AIMap['lineOfSight'][curI - 1][curJ] = GRID[curI - 1][curJ];
        }
    }

    function totalLineOfSight(AIMap)
    {
        //get down line of sight
        singleDirectionLineOfSight(AIMap, 0, 1);

        //get up line of sight
        singleDirectionLineOfSight(AIMap, 0, -1);

        //get right line of sight
        singleDirectionLineOfSight(AIMap, 1, 0);

        //get left line of sight
        singleDirectionLineOfSight(AIMap, -1, 0);
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
        var x = {
            'agentMap': agentMap,
            'enemyMap': enemyMap,
            };
        return ( x );
    };



    this.takeAction = function ( a )
    {
        step++;

        if ( THREE_RUN  )
            updateStatus();			// show status line before moves

        if(a != undefined && a['agentAction'] != undefined)
            takeTurnLogicalAI(agentMap, enemyMap, a['agentAction']);

        if(a != undefined && a['enemyAction'] != undefined)
            takeTurnLogicalAI(enemyMap, agentMap, a['enemyAction']);


        if ( THREE_RUN  )
        {
            if(agentMap['health'] > 0) {
                drawAgent();
            }
            else{
                removeDeadAI(agentMap);
            }
            if(enemyMap['health'] > 0)
            {
                drawEnemy();
            }
            else
            {
                removeDeadAI(enemyMap);
            }
            updateStatus();			// show status line after moves
        }
    };



    this.endRun = function()
    {
        if ( THREE_RUN  )
        {
                $("#user_span6").html("<font color=red> <B> Run over. </B> </font>   "  );
        }

    };



    this.getScore = function()
    {
        //Note that this function gets the highest of the two ai score's.  This is the score that will be displayed
        //on the world leaderboard, not the one ingame

        if(agentMap['score'] > enemyMap['score'])
        {
            //console.log('end score = :' + agentMap['score']);
            return agentMap['score'];
        }
        else
        {
           // console.log('end score = :' + enemyMap['score']);
            return enemyMap['score'];
        }
    };


}

//---- end of World class -------------------------------------------------------
