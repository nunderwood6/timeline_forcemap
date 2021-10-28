#Coding Massacres from the CEH Report
Massacres were hand coded from the full CEH report, a PDF document with more than 4,000 pages. There were two distinct types. Most of the massacres were coded from the Casos Presentados section of the Appendix, which contains only short descriptions of each event. The remainder were coded from the Casos Ilustrativos section, which includes in depth descriptions of each massacre, including background information and the aftermath. Descriptions were copy/pasted directly from the report. I used the municipio+department name as a join code to add a column with municipio codes so the massacres could be mapped, and manually spot checked each row.


The files in the *input* folder,*casos_presentados.csv* and *casos_ilustrativos.csv*, are downloaded directly from the Google Sheets where the massacres were hand codied.

#Combining Casos Presentados and Casos Ilustrados
In the *combine_csv.js*, a Node script does some formatting of the data and combines the casos_presentados and casos_ilustrativos into a single data structure.

#Filtering and Handling Dates
I only wanted to include massacres with a certain level of geographic and temporal uncertainty. Massacres without municipio codes(those that happened in Mexico), and without specific years were filtered out.

For the purpose of the timeline, each massacre needed to be assigned a Javascript time object, so each needs to have a discrete year, month, and day. For those that were missing months and/or days in the CEH report, I assigned a month/day randomly. The original *day*,*month*, and *year* attributes are left intact so it's still possible to see which actually contained those attributes.


#Structuring by Municipio
Next, massacres were nested by municipio and added as a property of the municipio geojson, which was then written to a file called *massacres_nested.geojson*. Massacres were sorted by size in descending for efficient circle packing.

#Calculating circle positions
To visualize multiple massacres aggregated at the municipal level, I used D3's circle packing and force simulation algorithms to cluster circles as close as possible to the municipio's centroid without overlapping other circles, in *calculateCirclePositions.js*. Positions needed to be calculated for each time period since the circles nudge each other around as they are added. Each circle has positions stored for each time period. Since the positions are pixel values, they are specific to the viewbox size where they are calculated. The script console.log's the viewbox dimensions so the corresponding values can be updated in *main.js*.




