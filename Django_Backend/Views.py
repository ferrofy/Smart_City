from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

latest_sensor_data = {"light": 0, "waste_distance": 0}

@csrf_exempt
def Update_Sensor_Data(request):
    global latest_sensor_data
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            latest_sensor_data.update(data)
            return JsonResponse({'status': 'Success'})
        except Exception as e:
            return JsonResponse({'status': 'Error'}, status=400)
    return JsonResponse({'status': 'Invalid Method'}, status=405)

def Dashboard_View(request):
    return render(request, 'Index.html', {'sensor_data': latest_sensor_data})
