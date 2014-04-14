"use strict";

var app = app || {};

app.AI = Backbone.Model.extend({
    _findAllMoves: function(game, gameGrid) {
        // Returns a mapping of {move} -> {score}. Score is set later.
        var result = {};
        var moves = game.possibleMovesForGrid(gameGrid);
        for (var move in moves) {
            if (moves[move]) {
                result[move] = 0;
            }
        }
        return result;
    },
    _evaluatePosition: function(game, gameGrid) {
        return Math.random();
    },
    _evaluateMoves: function(game, gameGrid, moveScores) {
        for(var move in moveScores) {
            var newGrid = game.newGridForMove(gameGrid, move);
            moveScores[move] = this._evaluatePosition(game, newGrid);
        }
    },
    _bestMove: function(game, gameGrid) {
        var moveScores = this._findAllMoves(game, gameGrid);
        this._evaluateMoves(game, gameGrid, moveScores);
        var result = false;

        var bestScore = -999999;
        for(var move in moveScores) {
            if (moveScores[move] > bestScore) {
                result = move;
                bestScore = moveScores[move];
            }
        }
        return result;
    },
    bestMove: function(game) {
        return this._bestMove(game, game.grid);
    }
});

app.AIRandom = app.AI.extend({
    // Simply the default behaviour.
});

app.AIAvoidUp = app.AI.extend({
    _evaluateMoves: function(game, gameGrid, moveScores) {
        app.AI.prototype._evaluateMoves.apply(this, arguments); // super()
        // Drop the score of "UP" so we avoid it.
        if (game.MOVE_UP in moveScores) {
            moveScores[game.MOVE_UP] = 0;
        }
    }
});

app.AIPreferDown = app.AIAvoidUp.extend({
    _evaluateMoves: function(game, gameGrid, moveScores) {
        app.AIAvoidUp.prototype._evaluateMoves.apply(this, arguments); // super()
        // Pump the score of "DOWN" so we pick it if we can.
        if (game.MOVE_DOWN in moveScores) {
            moveScores[game.MOVE_DOWN] = 1000;
        }
    }
});

app.AIDownRightLeft = app.AI.extend({
    _evaluateMoves: function(game, gameGrid, moveScores) {
        if (game.MOVE_DOWN in moveScores) {
            moveScores[game.MOVE_DOWN] = 4;
        }
        if (game.MOVE_RIGHT in moveScores) {
            moveScores[game.MOVE_RIGHT] = 3;
        }
        if (game.MOVE_LEFT in moveScores) {
            moveScores[game.MOVE_LEFT] = 2;
        }
        if (game.MOVE_UP in moveScores) {
            moveScores[game.MOVE_UP] = 1;
        }
    }
});

app.AIMaximizeEmpty = app.AI.extend({
    _evaluatePosition: function(game, gameGrid) {
        var score = 0;
        for (var x=0; x < game.SIZE; x++) {
            for (var y=0; y < game.SIZE; y++) {
                if (gameGrid[x][y] == 0) {
                    score += 1;
                }
            }
        }
        // Perturb to not bias for a particular direction.
        return score + Math.random();
    }
});

app.AIKeepNumbersClose = app.AI.extend({
    _evaluatePosition: function(game, gameGrid) {
        var score = 0;
        // Check adjacent tiles along rows.
        for (var x=0; x < game.SIZE-1; x++) {
            for (var y=0; y < game.SIZE; y++) {
                var tile1 = gameGrid[x][y];
                var tile2 = gameGrid[x+1][y];

                if (tile1 == 0 || tile2 == 0) {
                    continue;
                }
                var ratio = tile1 / tile2;
                if (ratio > 2 || ratio < 0.5) {
                    score -= 1;
                }
            }
        }
        // Same thing for columns.
        for (var x=0; x < game.SIZE; x++) {
            for (var y=0; y < game.SIZE-1; y++) {
                var tile1 = gameGrid[x][y];
                var tile2 = gameGrid[x][y+1];

                if (tile1 == 0 || tile2 == 0) {
                    continue;
                }
                var ratio = tile1 / tile2;
                if (ratio > 2 || ratio < 0.5) {
                    score -= 1;
                }
            }
        }
        // Perturb to not bias for a particular direction.
        return score + Math.random();
    }
});

app.AIBigNumbersToEdge = app.AI.extend({
    _evaluatePosition: function(game, gameGrid) {
        var score = 0;
        for (var x=0; x < game.SIZE; x++) {
            for (var y=0; y < game.SIZE; y++) {
                if (x == 0 || x == game.SIZE-1) {
                    score += gameGrid[x][y];
                }
                if (y == 0 || y == game.SIZE-1) {
                    score += gameGrid[x][y]; // Corners are double-counted.
                }
            }
        }
        // Perturb to not bias for a particular direction.
        return score + Math.random();
    }
});

app.ais = {
    'Random Moves': new app.AIRandom(),
    'Avoid Up': new app.AIAvoidUp(),
    'Prefer Down': new app.AIPreferDown(),
    'Down-right-left': new app.AIDownRightLeft(),
    'Maximize empty tiles': new app.AIMaximizeEmpty(),
    'Keep numbers close': new app.AIKeepNumbersClose(),
    'Big numbers to edge': new app.AIBigNumbersToEdge()
}