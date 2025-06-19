# ExoDemineur

Bienvenue dans le jeu **Demineur**... sous Windows 11 ! 

## Description

Ce projet est une implémentation du jeu mythique Démineur. Il permet de jouer, de personnaliser la taille de la grille et le nombre de mines.

## Règles du jeu

- Lancez l'application
- Choisissez la taille de la grille et le nombre de mines
- Cliquez sur les cases pour révéler leur contenu
- Marquez les mines avec un drapeau

## Stack

### Back-End

#### Python x framework Flask
- 🗄️ Gestion de l'état du jeu côté serveur
- 🎲 Génération sécurisée des mines
- 🔒 Validation des mouvements
- 📊 Historique des parties (pour une potentielle extension)

### Front-End

#### JavaScript
- 🎨 Interface utilisateur.ice et animations
- 🌐 Communication avec Flask via API
- 🔄 Mode fallback si Flask n'est pas disponible
- ⚡ Gestion en temps réel des interactions

### Pourquoi cette architecture ? 
- Sécurité : La grille est générée côté serveur
- Extensibilité : Facile d'ajouter des fonctionnalités
- Robustesse : Mode offline si le serveur plante
- Clean Code : Architecture client-serveur lisible


## Autrice

- Marine GAREIN | Apprenante Ada Tech School | Promotion Frances Spence

