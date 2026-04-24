# Pong (ping)

[PONG GIF](https://media.discordapp.net/attachments/1193863959510528000/1497349852395208844/ezgif.com-crop.gif?ex=69ed3338&is=69ebe1b8&hm=df05df8d054de4032870e9f9b82c60fac1682493f1dce9228909c6f404b096b8&=)

## Objectif du projet

Ce projet consiste à implémenter un système d’intelligence artificielle basé sur la neuro-évolution, appliqué à un jeu de Pong.

L’objectif est de faire apprendre à des agents (raquettes) à jouer automatiquement en utilisant :
- un réseau de neurones artificiel
- un algorithme génétique

Contrairement aux méthodes classiques (supervisées), la neuro-évolution n’utilise pas d’exemples à apprendre, mais uniquement une mesure de performance => fitness.

## Mise en oeuvre

Pour la mise en œuvre du projet, Nous avons choisi de procéder de manière progressive, en partant d’une version simple pour ensuite ajouter des fonctionnalités au fur et à mesure.

Nous avons d’abord implémenté une version basique du jeu Pong avec une population d’agents contrôlés par des réseaux de neurones. Chaque agent est évalué en fonction de ses performances, ce qui permet d’appliquer un processus de sélection naturelle. En effet, dans la neuro-évolution, les solutions sont évaluées via une fitness qui guide leur évolution.

Ensuite, nous avons ajouté les mécanismes génétiques classiques :
- sélection des meilleurs individus
- reproduction par crossover
- mutation des poids

Une fois cette base fonctionnelle, nous avons progressivement enrichi le projet.

## Conception

Comme papa dans maman.

Concernant la conception, nous avons surtout réfléchi à la manière de représenter le problème et de guider l’apprentissage.

J’ai donc conçu le système autour de trois éléments principaux :
- un réseau de neurones pour prendre des décisions
- une représentation génétique (ADN) pour faire évoluer ces réseaux
- une fonction de fitness pour orienter l’apprentissage

Une partie importante de la conception a été d’ajuster cette fitness pour encourager un comportement pertinent.Nous avons également fait le choix d’ajouter des mécanismes comme la variation d’environnement ou le curriculum, afin d’éviter que l’agent apprenne uniquement un cas spécifique.

Enfin, nous avons essayé de garder une conception flexible, permettant de tester facilement différentes configurations, ce qui m’a permis d’expérimenter et de mieux comprendre l’impact des choix effectués sur l’apprentissage.

## IA utilisées

ChatGPT / Cursor => Composer / Antigravity => Gemini & Claude

## Hébergement

Lien vers le projet : https://kinopix621.github.io/steering-behavior-project/

## Vidéo

Lien vers la vidéo : https://youtu.be/UjqgksVWVT4