## HU - 3 - Editar un campus
Dado que le doy clic al icono del lapiz cuando se listan los campus deseo que salga un modal con los siguientes atributos del campus:
* Codigo del campus
* Nombre del campus
* Direccion del campus
* Uso del Map picker para poder editar la "lat" y "lng" del campus
* Activo
Todos estos campos deben ser editables y el modal debe tener el boton Guardar.
Criterios de validacion:
1. Codigo, Nombre, Direccion son de tipo string
2. lat y lng son de tipo float que son guardados como Point en la BD
3. Activo es de tipo Boolean
4. Se debe poder modificar uno o todos estos campos
5. Se debe generar un toast informativo sobre el cambio

END POINT: /api/campus/{id}
Request body example:
{
  "codigo": "123456789",
  "nombre": "Campus Central",
  "direccion": "Avenida sucre entre belzu y oquendo",
  "lat": -17.393178,
  "lng": -66.157389,
  "activo": true
}