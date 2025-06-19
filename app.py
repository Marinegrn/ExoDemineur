from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

class Minesweeper:
    def __init__(self, rows=10, cols=10, mines=15):
        self.rows = rows
        self.cols = cols
        self.mines = mines
        self.grid = [[0 for _ in range(cols)] for _ in range(rows)]
        self.revealed = [[False for _ in range(cols)] for _ in range(rows)]
        self.flagged = [[False for _ in range(cols)] for _ in range(rows)]
        self.game_over = False
        self.won = False
        self.generate_mines()
        self.calculate_numbers()
    
    def generate_mines(self):
        """Étape 1: Génère une grille avec K mines placées aléatoirement"""
        mine_positions = set()
        while len(mine_positions) < self.mines:
            row = random.randint(0, self.rows - 1)
            col = random.randint(0, self.cols - 1)
            mine_positions.add((row, col))
        
        for row, col in mine_positions:
            self.grid[row][col] = -1  # -1 représente une mine
    
    def calculate_numbers(self):
        """Calcule le nombre de mines adjacentes pour chaque case"""
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        
        for row in range(self.rows):
            for col in range(self.cols):
                if self.grid[row][col] != -1:  # Si ce n'est pas une mine
                    count = 0
                    for dr, dc in directions:
                        new_row, new_col = row + dr, col + dc
                        if (0 <= new_row < self.rows and 0 <= new_col < self.cols and 
                            self.grid[new_row][new_col] == -1):
                            count += 1
                    self.grid[row][col] = count
    
    def reveal_cell(self, row, col):
        """Étape 2: Révèle une case et gère la logique du jeu"""
        if (self.game_over or self.revealed[row][col] or 
            self.flagged[row][col] or row < 0 or row >= self.rows or 
            col < 0 or col >= self.cols):
            return
        
        self.revealed[row][col] = True
        
        # Si c'est une mine, fin du jeu
        if self.grid[row][col] == -1:
            self.game_over = True
            return
        
        # Si la case est vide (0 mines adjacentes), révéler automatiquement les cases adjacentes
        if self.grid[row][col] == 0:
            directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
            for dr, dc in directions:
                self.reveal_cell(row + dr, col + dc)
        
        # Vérifier si le joueur a gagné
        self.check_win()
    
    def toggle_flag(self, row, col):
        """Toggle le drapeau sur une case"""
        if not self.game_over and not self.revealed[row][col]:
            self.flagged[row][col] = not self.flagged[row][col]
    
    def check_win(self):
        """Vérifie si le joueur a gagné"""
        for row in range(self.rows):
            for col in range(self.cols):
                if self.grid[row][col] != -1 and not self.revealed[row][col]:
                    return False
        self.won = True
        self.game_over = True
        return True
    
    def get_state(self):
        """Retourne l'état actuel du jeu"""
        state = []
        for row in range(self.rows):
            row_state = []
            for col in range(self.cols):
                cell = {
                    'revealed': self.revealed[row][col],
                    'flagged': self.flagged[row][col],
                    'value': self.grid[row][col] if self.revealed[row][col] or self.game_over else None
                }
                row_state.append(cell)
            state.append(row_state)
        return state

# Instance globale du jeu
game = None

@app.route('/')
def index():
    return render_template('minesweeper.html')

@app.route('/new_game', methods=['POST'])
def new_game():
    global game
    data = request.get_json()
    rows = data.get('rows', 10)
    cols = data.get('cols', 10)
    mines = data.get('mines', 15)
    
    game = Minesweeper(rows, cols, mines)
    
    return jsonify({
        'success': True,
        'state': game.get_state(),
        'game_over': game.game_over,
        'won': game.won,
        'rows': game.rows,
        'cols': game.cols,
        'mines': game.mines
    })

@app.route('/reveal', methods=['POST'])
def reveal():
    global game
    if not game:
        return jsonify({'error': 'No game in progress'}), 400
    
    data = request.get_json()
    row = data.get('row')
    col = data.get('col')
    
    game.reveal_cell(row, col)
    
    return jsonify({
        'success': True,
        'state': game.get_state(),
        'game_over': game.game_over,
        'won': game.won
    })

@app.route('/flag', methods=['POST'])
def flag():
    global game
    if not game:
        return jsonify({'error': 'No game in progress'}), 400
    
    data = request.get_json()
    row = data.get('row')
    col = data.get('col')
    
    game.toggle_flag(row, col)
    
    return jsonify({
        'success': True,
        'state': game.get_state(),
        'game_over': game.game_over,
        'won': game.won
    })

if __name__ == '__main__':
    app.run(debug=True)