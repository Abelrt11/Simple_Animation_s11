# Simple_Animation_s11
Created with CodeSandbox

# Animación con Three.js, Ammo.js y Tween.js
Puente, muro destructible y cañón

Este proyecto implementa una animación 3D utilizando Three.js para el renderizado, Ammo.js para la simulación física y Tween.js para la animación personalizada de objetos. La escena representa un puente sostenido por un muro de ladrillos, con cubos que lo atraviesan y un cañón que dispara proyectiles capaces de destruir la estructura.

# Descripción general de la animación

## La animación representa un entorno formado por:

* Un terreno principal y dos plataformas elevadas de tierra situadas a ambos extremos.

* Un muro construido con ladrillos individuales, cada uno con físicas independientes.

* Una rampa (también física) situada sobre el muro, formando un puente entre las dos plataformas de tierra.

* Un conjunto de cubos que se desplazan desde una plataforma a la otra pasando por encima del puente.

* Un cañón colocado en la parte frontal de la escena que dispara bolas rojas hacia el muro, provocando su colapso.

La escena combina tanto animaciones manuales como comportamientos físicos simulados.

# Elementos principales
Terreno y plataformas laterales

El suelo principal sirve como base de la escena. A ambos lados del puente se colocan dos bloques que representan tierra elevada; estos definen el inicio y el final del recorrido de los cubos.

* Muro de ladrillos

Está formado por varias filas y columnas de ladrillos individuales. Cada ladrillo posee un cuerpo físico independiente, lo que permite que el muro se derrumbe de forma realista cuando recibe impactos del cañón o cuando la rampa pierde estabilidad.

* Rampa o puente

Es un bloque físico que descansa sobre el muro. Actúa como superficie por la que los cubos se desplazan, conectando las plataformas de tierra.

* Cubos en movimiento

Cuatro cubos avanzan desde la plataforma izquierda hasta la derecha. Su movimiento no depende de la física, sino de una animación programada que traslada sus posiciones y aplica rotación para simular rodadura.
El movimiento está temporizado y reproduce un desplazamiento continuo sobre el puente.

* Cañón frontal

Se sitúa frente al muro y dispara bolas rojas en intervalos programados.
Cada proyectil es un cuerpo físico con velocidad inicial dirigida hacia el muro.
Cuando los proyectiles impactan contra la estructura, la física de Ammo.js genera el derrumbe del puente o el desplazamiento de ladrillos.

# Funcionamiento de la animación

* Inicialización de gráficos
La escena, cámara, luces y controles de usuario se configuran mediante Three.js.

* Inicialización de físicas
Se crea un mundo físico con gravedad realista. Todos los objetos que requieren físicas se registran en él.

* Construcción de la escena
Se generan el terreno, las plataformas, el muro, la rampa y el cañón.
Cada elemento sólido que necesita física recibe un cuerpo rígido dentro del motor físico.

* Animación de los cubos
Los cubos no participan en la simulación física; se animan mediante interpolación.
Su desplazamiento se calcula de forma progresiva hasta completar el recorrido entre ambos extremos del puente.
La rotación se ajusta según la distancia recorrida, creando la sensación de rodadura.

* Disparo de bolas del cañón
En intervalos temporales predefinidos, el cañón genera esferas físicas que avanzan hacia el muro.
Las colisiones producidas por estos proyectiles afectan la estructura completa del muro y la rampa.

* Actualización continua
En cada fotograma se realizan tres tareas:

- Avanzar la simulación física.

-Actualizar la animación de los cubos.

- Renderizar la escena completa desde la cámara.

El resultado final permite observar cómo una estructura elaborada puede reaccionar frente a objetos disparados desde un cañón, y cómo los elementos no físicos pueden coexistir con elementos físicamente simulados.
