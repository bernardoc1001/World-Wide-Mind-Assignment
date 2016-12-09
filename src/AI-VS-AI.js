//Note that this mind is controlling two separate AI in the world.  This means that this mind must take in the state of
//two AI's each turn and return the corresponding action for each AI

function randomPick ( a, b )
{
    if ( randomBoolean() )
        return a;
    else
        return b;
}

//The available behaviour states
const B_DAMAGE_HUNTING   = 0;
const B_HEALTH_HUNTING   = 1;
const B_OPPONENT_HUNTING = 2;
const B_FIGHTING         = 3;

//Fitness Levels
const F_VERY_HIGH = 20; // used for direction of top priority
const F_HIGH = 15;  //used for direction of second priority
const F_MEDIUM = 10; //used for direction of third priority
const F_LOW = 5; //used for direction of fourth priority
const F_VERY_LOW = 0; //used for direction of fifth priority
const F_LOWEST = -20; //used for a direction the ai wants to avoid (i.e if running away from the enemy)
const F_INVALID = -100; //This will mainly be used when the block next to the ai is a wall


function Mind() {


    function selectBehaviourState(AIMap)
    {
        if(AIMap['health'] <= 25 && AIMap['trapped'] === false)
        {
            return B_HEALTH_HUNTING;
        }
        else if(AIMap['attackDamage'] <= 1 && AIMap['health'] > 25 && AIMap['trapped'] === false)
        {
            return B_DAMAGE_HUNTING;
        }
        else if (AIMap['attackDamage'] > 1 && AIMap['health'] > 25 && AIMap['opponentInRange'] === false)
        {
            return B_OPPONENT_HUNTING;
        }
        else if(AIMap['trapped'] === true || (AIMap['opponentInRange'] == true && AIMap['attackDamage'] > 1 && AIMap['health'] > 25))
        {
            return B_FIGHTING;
        }
    }

    function setPriorities(b)
    {

        var prioritiesMap = {
            'behaviour': b,
            'topPriority': null,
            'secondPriority': null,
            'thirdPriority': null,
            'fourthPriority': null,
            'fifthPriority': null,
            'avoidOpponent': null
        };

        //set priorities
        switch(b)
        {
            case B_DAMAGE_HUNTING:
                prioritiesMap['topPriority'] = GRID_DAMAGE_PICKUP;
                prioritiesMap['secondPriority'] = GRID_HEALTH_PICKUP;
                prioritiesMap['thirdPriority'] = GRID_BLANK;
                prioritiesMap['fourthPriority'] = GRID_PORTAL;
                prioritiesMap['avoidOpponent'] = true;
                break;

            case B_HEALTH_HUNTING:
                prioritiesMap['topPriority'] = GRID_HEALTH_PICKUP;
                prioritiesMap['secondPriority'] = GRID_PORTAL;
                prioritiesMap['thirdPriority'] = GRID_BLANK;
                prioritiesMap['fourthPriority'] = GRID_DAMAGE_PICKUP;
                prioritiesMap['avoidOpponent'] = true;
                break;

            case B_OPPONENT_HUNTING:
                prioritiesMap['topPriority'] = GRID_OPPONENT_OCCUPIED;
                prioritiesMap['secondPriority'] = GRID_DAMAGE_PICKUP;
                prioritiesMap['thirdPriority'] = GRID_HEALTH_PICKUP;
                prioritiesMap['fourthPriority'] = GRID_BLANK;
                prioritiesMap['fifthPriority'] = GRID_PORTAL;
                prioritiesMap['avoidOpponent'] = false;
                break;
            //no need to set priorities for fighting, only option is to attack or not be in fighting behaviour state.
        }
        return prioritiesMap;
    }

    function checkBlockFitness(AIMap,i,j,p)
    {
        var blockFitness;
        switch (AIMap['lineOfSight'][i][j])
        {
            case p['topPriority']:
                blockFitness = F_VERY_HIGH;
                break;

            case p['secondPriority']:
                blockFitness = F_HIGH;
                break;

            case p['thirdPriority']:
                blockFitness = F_MEDIUM;
                break;

            case p['fourthPriority']:
                blockFitness = F_LOW;
                break;

            case p['fifthPriority']:
                blockFitness = F_VERY_LOW;
                break;

            case (GRID_OPPONENT_OCCUPIED && p['avoidOpponent'] === true):
                blockFitness = F_LOWEST;
                break;

            case GRID_WALL:
                blockFitness = F_INVALID;
                break;
        }

        return blockFitness;
    }

    //calculate single direction fitness
    function calculateSingleDirectionFitness(AIMap, iModifier, jModifier,p)
    {
        var fitness = F_INVALID;
        var curBlockBeingCheckedFitness;
        var firstSideBlockBeingCheckedFitness;
        var secondSideBlockBeingCheckedFitness;
        var curI = AIMap['i'] + iModifier; //add the modifier first to look at square this AI is not occupying
        var curJ = AIMap['j'] + jModifier; //add the modifier first to look at square this AI is not occupying
        //first check if direction is valid
        if(AIMap['lineOfSight'][curI][curJ] == GRID_WALL)
        {
            return fitness;
        }
        while(AIMap['lineOfSight'][curI][curJ] != GRID_WALL && AIMap['lineOfSight'][curI][curJ] != GRID_OPPONENT_OCCUPIED ) //as far as the line of sight goes
        {
            //if block == F_LOWEST then return F_LOWEST
            //else if block > fitness  then fitness == block


            //get cur block
            curBlockBeingCheckedFitness =  checkBlockFitness(AIMap, curI, curJ, p);

            //get 1st side block
            if(iModifier != 0)//grab above and below blocks aswell
            {
                //get 1st side block
                firstSideBlockBeingCheckedFitness =  checkBlockFitness(AIMap, curI, curJ + 1, p);

                //get 2nd side block
                secondSideBlockBeingCheckedFitness =  checkBlockFitness(AIMap, curI, curJ - 1, p);
            }
            else //grab blocks to the left and right aswell
            {
                //get 1st side block
                firstSideBlockBeingCheckedFitness = checkBlockFitness(AIMap, curI + 1, curJ, p);

                //get 2nd side block
                secondSideBlockBeingCheckedFitness = checkBlockFitness(AIMap, curI -1, curJ,p);
            }

            //check cur block
            if(curBlockBeingCheckedFitness == F_LOWEST)
            {
                return F_LOWEST;
            }
            else if(curBlockBeingCheckedFitness > fitness)
            {
                fitness = curBlockBeingCheckedFitness;
            }

            //check 1st side block
            if(firstSideBlockBeingCheckedFitness == F_LOWEST)
            {
                return F_LOWEST;
            }
            else if(firstSideBlockBeingCheckedFitness> fitness)
            {
                fitness = firstSideBlockBeingCheckedFitness;
            }

            //check 2nd side block
            if(secondSideBlockBeingCheckedFitness == F_LOWEST)
            {
                return F_LOWEST;
            }
            else if(secondSideBlockBeingCheckedFitness > fitness)
            {
                fitness = secondSideBlockBeingCheckedFitness;
            }

            //increment modifiers for next iteration.
            curI += iModifier;
            curJ += jModifier;
        }

        //check the last square (don't care about the side squares, because the last square is either a wall or the opponent)
        curBlockBeingCheckedFitness =  checkBlockFitness(AIMap, curI, curJ, p);
        if(curBlockBeingCheckedFitness == F_LOWEST)
        {
            return F_LOWEST;
        }
        else if(curBlockBeingCheckedFitness > fitness)
        {
            fitness = curBlockBeingCheckedFitness;
        }


        if(fitness == F_LOW && AIMap['oldI'] == (AIMap['i'] + iModifier) && AIMap['oldJ'] == (AIMap['j'] + jModifier))
        {
            //lower the priority to very low if the direction the AI was last turn doesn't contain a medium or higher priority
            //this will encourage the AI to explore newer directions
            fitness = F_VERY_LOW;
        }

        return fitness;
    }


    //calculate total direction fitness
    function calculateHighestMoveFitness(AIMap, b)
    {
        var p = setPriorities(b);
        var action;

        var upFitness  = calculateSingleDirectionFitness(AIMap,0,-1, p);
        var downFitness = calculateSingleDirectionFitness(AIMap,0,1,p);
        var leftFitness = calculateSingleDirectionFitness(AIMap,-1, 0, p);
        var rightFitness = calculateSingleDirectionFitness(AIMap,1,0,p);

        var highestFitness = Math.max(upFitness, downFitness, leftFitness, rightFitness);

        switch (highestFitness)
        {
            case upFitness:
                action = ACTION_UP;
                break;

            case downFitness:
                action = ACTION_DOWN;
                break;

            case leftFitness:
                action = ACTION_LEFT;
                break;

            case rightFitness:
                action = ACTION_RIGHT;
                break;
        }

        return action;
    }

    function pickAction(AIMap)
    {
        var b = selectBehaviourState(AIMap);
        //todo remember is behaviour is B_FIGHTING then we don't need to check priorities, just attack
        if(b == B_FIGHTING)
        {
            return ACTION_ATTACK;
        }
        else
        {
            return calculateHighestMoveFitness(AIMap,b);

        }


    }


//--- public functions / interface / API ----------------------------------------------------------


    this.newRun = function()
    {
    };

    this.endRun = function()
    {
    };



    this.getAction = function ( x )		// x is a map containing the agentMap and the enemyMap
    {
        var agentMove = pickAction(x['agentMap']);
        var enemyMove = pickAction(x['enemyMap']);
        var a = {
            'agentAction': agentMove,
            'enemyAction': enemyMove
        };

        /*
        console.log('agentAction: ' + a['agentAction']);
        console.log('enemyAction: ' + a['enemyAction']);
        */

        return a;
    };

}



