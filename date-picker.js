document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o Flatpickr com configurações em português
    const datePicker = flatpickr("#date-range-picker", {
        mode: "range",
        dateFormat: "d 'de' M 'de' Y",
        locale: "pt",
        defaultDate: [new Date().setDate(1), new Date()], // Primeiro dia do mês atual até hoje
        maxDate: "today",
        showMonths: 2,
        animate: true,
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                // Dispara um evento personalizado quando as datas são selecionadas
                const event = new CustomEvent('dateRangeSelected', {
                    detail: {
                        startDate: selectedDates[0],
                        endDate: selectedDates[1]
                    }
                });
                document.dispatchEvent(event);
            }
        }
    });
});
