#!/bin/bash
cd "$(dirname "$0")"
echo "Iniciando servidor local para Ecowave Implanta..."
echo "Abrindo o navegador em http://localhost:8080"
(sleep 1 && open "http://localhost:8080") &
python3 -m http.server 8080
