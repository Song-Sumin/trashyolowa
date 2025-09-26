$(document).ready(function () {
	// SPA-style page switcher
	window.showPage = function (pageId) {
		$('.page').removeClass('active');
		$('#' + pageId).addClass('active');
		$('.nav-link').removeClass('active');
		$('.nav-link[href="#' + pageId + '"]').addClass('active');
	};

	// Nav links
	$('.nav-link').on('click', function (e) {
		e.preventDefault();
		const target = $(this).attr('href').substring(1);
		showPage(target);
	});

	// Step controller
	window.showStep = function (stepNumber) {
		$('.step-section').hide();
		$('#step' + stepNumber).show();
	};

	// Initialize defaults
	const API_BASE = (window.location && window.location.origin && window.location.origin.startsWith('http'))
		? window.location.origin
		: 'http://127.0.0.1:8000';

	// Reset the report flow to initial state
	window.resetReportFlow = function () {
		// Steps visibility
		$('.step-section').hide();
		$('#step1').show();

		// File input and previews
		$('#imageInput').val('');
		$('#uploadedImage').hide();
		$('#previewImage').attr('src', '');
		$('#nextStep1').hide();

		// AI section defaults
		$('#aiImage').attr('src', 'image2.jpg');
		$('#recognizedItem').text('');
		$('#estimatedCost').text('');
		$('#manualSelection').hide();
		$('#itemSelect').val('');
		$('#manualCost').text('0원');

		// Address and details
		$('#addressSearch').val('');
		$('#addressDisplay').text('주소를 선택해주세요');
		$('#detailLocation').val('');
		setToday('#disposalDate');

		// Final step defaults
		$('#finalItem').text('');
		$('#finalCost').text('');
		$('#finalAddress').text('주소 정보');
		$('#paymentAmount').text('4,000원');
	};
	showStep(1);
	setToday('#disposalDate');

	// Upload simulation
	$('.camera-btn').on('click', function () {
		alert('카메라가 활성화되었습니다. 폐기물 사진을 촬영해주세요.');
		simulateImageUpload();
	});
    $('.gallery-btn').on('click', function () {
        $('#imageInput').trigger('click');
    });

    $('#imageInput').on('change', async function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            $('#uploadedImage').show();
            $('#previewImage').attr('src', ev.target.result);
            // Make next button available right away and set fallback AI image preview
            $('#nextStep1').show();
            $('#aiImage').attr('src', ev.target.result);
        };
        reader.readAsDataURL(file);

		try {
            const form = new FormData();
            form.append('file', file);
            form.append('model', 'best');
			const res = await fetch(API_BASE + '/api/predict', { method: 'POST', body: form });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert('분석 실패: ' + (err.detail || res.status));
                return;
            }
            const data = await res.json();
            if (data.annotated_image) {
                $('#aiImage').attr('src', data.annotated_image);
            }
            if (data.best_label) {
                $('#recognizedItem').text(data.best_label);
            }
            // Map to cost if available
            const itemTxt = $('#recognizedItem').text().trim();
            if (itemTxt && costMap[itemTxt]) {
                $('#estimatedCost').text(formatWon(costMap[itemTxt]));
            }
        } catch (err) {
            alert('네트워크 오류: ' + err);
        }
    });

	function simulateImageUpload() {
		setTimeout(function () {
			$('#uploadedImage').show();
			$('#previewImage').attr('src', 'image1.jpg');
			$('#nextStep1').show();
		}, 600);
	}

	$('#nextStep1').on('click', function () {
		showStep(2);
	});

	// Cost map (KRW)
	const costMap = {
		'TV': 6000,
		'냉장고': 7000,
		'밥상': 2000,
		'선풍기': 3000,
		'세탁기': 5000,
		'소파': 5000,
		'수납장': 4000,
		'의자': 1000,
		'장롱': 10000
	};

	function formatWon(value) {
		if (typeof value !== 'number' || isNaN(value)) return '';
		return value.toLocaleString('ko-KR') + '원';
	}

	$('.yes-btn').on('click', function () {
		// Accept AI result and go next
		showStep(3);
	});

	$('.no-btn').on('click', function () {
		$('#manualSelection').slideDown(200);
	});

	$('#itemSelect').on('change', function () {
		const selected = $(this).val();
		if (selected && costMap[selected]) {
			$('#recognizedItem').text(selected);
			$('#estimatedCost').text(formatWon(costMap[selected]));
			$('#manualCost').text(formatWon(costMap[selected]));
		}
	});

	$('#nextStep2').on('click', function () {
		// Ensure we have an item/cost
		const item = $('#recognizedItem').text().trim();
		const cost = $('#estimatedCost').text().trim();
		if (!item || !cost) {
			alert('품목을 선택하거나 AI 분석 결과를 확인해주세요.');
			return;
		}
		showStep(3);
	});

	// Address helpers
	$('.gps-btn').on('click', function () {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (pos) {
				const lat = pos.coords.latitude.toFixed(5);
				const lng = pos.coords.longitude.toFixed(5);
				$('#addressDisplay').text('현재 위치 (' + lat + ', ' + lng + ')');
			}, function () {
				$('#addressDisplay').text('현재 위치를 가져올 수 없습니다.');
			});
		} else {
			$('#addressDisplay').text('브라우저에서 위치 서비스를 지원하지 않습니다.');
		}
	});

	$('.search-btn').on('click', function () {
		const query = $('#addressSearch').val().trim();
		if (!query) {
			alert('주소를 입력하세요.');
			return;
		}
		$('#addressDisplay').text(query);
	});

	$('#nextStep3').on('click', function () {
		const item = $('#recognizedItem').text().trim();
		const cost = $('#estimatedCost').text().trim();
		const address = $('#addressDisplay').text().trim();
		const detail = $('#detailLocation').val().trim();
		if (!address || address === '주소를 선택해주세요') {
			alert('배출 주소를 설정해주세요.');
			return;
		}
		$('#finalItem').text(item);
		$('#finalCost').text(cost);
		$('#finalAddress').text(detail ? (address + ' / ' + detail) : address);
		$('#paymentAmount').text(cost);
		showStep(4);
	});

	$('#finalPayment').on('click', function () {
		const reportNo = generateReportNumber();
		const item = $('#finalItem').text();
		const cost = $('#finalCost').text();
		const addr = $('#finalAddress').text();

		$('#reportNumber').text(reportNo);
		$('#guideNumber').text(reportNo);
		$('#receiptItem').text(item);
		$('#receiptCost').text(cost);
		$('#receiptAddress').text(addr);

		// Append to MyPage history list
		const today = (function() {
			const d = new Date();
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const da = String(d.getDate()).padStart(2, '0');
			return y + '.' + m + '.' + da;
		})();
		const historyHtml =
			'<div class="history-item">' +
				'<div class="history-info">' +
					'<div class="report-date">' + today + '</div>' +
					'<div class="report-item">' + item + '</div>' +
					'<div class="report-cost">' + cost + '</div>' +
				'</div>' +
				'<div class="report-status pending">수거 예정</div>' +
				'<button class="view-detail-btn">상세보기</button>' +
			'</div>';
		$('#historyList').prepend(historyHtml);

		openModal();
	});

	// Modal helpers
	window.openModal = function () {
		$('#completionModal').fadeIn(150);
	};
	window.closeModal = function () {
		$('#completionModal').fadeOut(150);
	};

	// Admin stubs
	window.adminLogin = function () {
		const id = $('#adminId').val().trim();
		const pw = $('#adminPassword').val().trim();
		if (id === 'admin' && pw === 'admin123') {
			$('#adminLogin').hide();
			$('#adminDashboard').show();
		} else {
			alert('아이디 또는 비밀번호가 올바르지 않습니다. (예: admin / admin123)');
		}
	};

	window.showOptimalRoute = function () {
		alert('최적 경로 생성은 지도/내비 연동이 필요합니다. 데모에서는 생략합니다.');
	};

	window.showAllReports = function () {
		alert('전체 신고 내역 보기 (데모)');
	};

	// Utility: set today for date input
	function setToday(selector) {
		const today = new Date();
		const yyyy = today.getFullYear();
		const mm = String(today.getMonth() + 1).padStart(2, '0');
		const dd = String(today.getDate()).padStart(2, '0');
		$(selector).val(yyyy + '-' + mm + '-' + dd);
	}

	function generateReportNumber() {
		const d = new Date();
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const hh = String(d.getHours()).padStart(2, '0');
		const mi = String(d.getMinutes()).padStart(2, '0');
		const ss = String(d.getSeconds()).padStart(2, '0');
		return '' + yyyy + mm + dd + '-' + hh + mi + ss;
	}

	// MyPage: detail button (delegated) -> open receipt modal with row data
	$('#historyList').on('click', '.view-detail-btn', function () {
		const row = $(this).closest('.history-item');
		const date = row.find('.report-date').text();
		const item = row.find('.report-item').text();
		const cost = row.find('.report-cost').text();
		$('#reportNumber').text(date.replaceAll('.', '') + '-HIST');
		$('#guideNumber').text(date.replaceAll('.', '') + '-HIST');
		$('#receiptItem').text(item);
		$('#receiptCost').text(cost);
		$('#receiptAddress').text('마이페이지 저장 주소 (데모)');
		openModal();
	});
});

$(document).ready(function () {
    let count = 0;
    $('.out').on('mouseover', function () {
        // 첫 번째 <p> 태그에 "mouse over"
        $(this).find('p').eq(0).text('mouse over');
        // 두 번째 <p> 태그 숫자 증가
        count++;
        $(this).find('p').eq(1).text(count);
    });

    $('.out').on('mouseout', function () {
        // 첫 번째 <p> 태그에 "mouse out"
        $(this).find('p').eq(0).text('mouse out');
    });

    $("#b1").on("click",
        {url:"http://www.google.com",
        winattributes: "resize=1, scrollbars=1, status=1"},
        max_open);
        function max_open(event) {
        var maxwindow = window.open(event.data.url, "", event.data.winattributes); 
        maxwindow.moveTo(0, 0);
        maxwindow.resizeTo(screen.availWidth, screen.availHeight);
        }


        function flash() {
            $("#off_test").show().fadeOut("slow");
        }
        $( "#bind" ).click(function() {
        $( "body" )
        .on( "click", "#theone", flash ) 
        .find( "#theone" )
        .text( "Can Click!" );
        });
        $( "#unbind" ).click(function() {
        $( "body" )
        .off( "click", "#theone", flash )
        .find( "#theone" )
        .text( "Does nothing..." );
         });
        
   
    const $triggerTest = $("#trigger_test");
    $triggerTest.find("button").eq(0).click(function() {
        update($triggerTest.find("span").eq(0));
    });
    $triggerTest.find("button").eq(1).click(function() {
        update($triggerTest.find("span").eq(1));
        $triggerTest.find("button").eq(0).trigger("click"); // 첫 번째 버튼도 클릭
    });
    $triggerTest.find("button").eq(0).trigger("click");
    update($triggerTest.find("span").eq(1));

    function update(j) {
        var n = parseInt(j.text(), 10);
        j.text(n + 1);
    }

    // 이미지 클릭 시 introme.jpg와 road.jpg 번갈아 나오기
    $("#image").click(function() {
        const img1 = "road.jpg";
        const img2 = "introme.jpg";
        const current = $(this).attr("src");
        $(this).attr("src", current === img1 ? img2 : img1);
    });

    var album = ["img1.png", "img2.png", "img3.png", "img4.png", "img5.png"];
    var current = 0;
    // 첫 번째 이미지를 앨범에 할당
    $("#imgAlbum").attr("src", album[0]);

    $("#imgAlbum").click(function() {
        current = (current + 1) % album.length;
        $(this).attr("src", album[current]);
    });

    $('.main-menu').on('mouseover', function () {
        var menu = $(this);
        menu.css({"font-size":"20px","background-color":"green"});
    });

    $('.main-menu').on('mouseout', function () {
        var menu = $(this);
        menu.css({"font-size":"1em","background":"none"});
    });



    $("#add_img img").click(function() {
        $("#note_form").addClass("popup");
        change_position($(".popup"));
        //$("#note_form").css("display","block");
        $("#note_form").fadeIn(1000);
        
    });

    $("#add_note").click(function() {
        var title = $("#note_title").val();
        var date = $("#note_date").val();
        var content = $("#note_content").val();
        var str = "<p>"+title+"<br>"+date+"<br>"+content+"</p><br>";
        //$("#note_form").css("display","none");

        $("#note_form").fadeOut(1000);
        $("#note").append(str);

    });

    $(window).resize(function(){
        change_position($(".popup"));
    });

function change_position(obj){
    let l = ($(window).width() - obj.width())/2;
    let t = ($(window).height() - obj.height())/2;
    obj.css({top:t,left:l});
}


    $("#moving_button").click(function() {
    if ($("#moving_box").width() <= $("#animation_test").width() - 50) {
        $("#moving_box").animate({
            right: '0px',
            height: '+=50px',
            width: '+=50px'
        });
        $("#animation_test").animate({
            height: '+=50px'
        });
    }
    });

    $(".accordion").each(function(){
        var dl = $(this);
        var alldd = dl.find("dd");
        var alldt = dl.find("dt");
        alldd.hide();
        alldt.css("cursor","pointer");


        alldt.click(function(){
            alldd.hide();
            var dt = $(this);
            var dd = dt.next();
            dd.show();

            alldt.css("cursor","pointer");
            dt.css("cursor","default");
        });

    });

});


